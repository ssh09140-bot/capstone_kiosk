import axios from 'axios';
import prisma from '../db';
import { convertToBaseUnit } from './unitConversionService';
import { subDays, addDays, format, getDay } from 'date-fns';

// --- Types & Interfaces ---

interface WeatherInfo {
  main: { temp: number };
  weather: { main: string; description: string }[];
  dt_txt: string;
}

export interface SimplifiedWeather {
  date: string;
  temp_celsius: number;
  condition: 'Rain' | 'Snow' | 'Clear' | 'Clouds' | 'Other';
}

interface InventoryAnalysisData {
  id: number;
  name: string;
  unit: string;
  currentStock: number;
  price: number; // 평균 단가
  dailyUsages: number[]; // 일별 사용량 (최근 N일)
  leadTime: number;
  supplierId: number;
  supplierName: string;
  minStockThreshold: number; // 기존 설정값 (참고용)
  packAmount: number; // 발주 단위
}

// --- Constants ---

const ANALYSIS_DAYS = 28; // 4주 데이터 분석
const SERVICE_LEVEL_Z_SCORE: { [key: string]: number } = {
  A: 2.33, // 99% (핵심 자재)
  B: 1.65, // 95% (일반 자재)
  C: 1.28, // 90% (비중 낮은 자재)
};

// --- Helper Functions ---

/**
 * OpenWeatherMap API를 통해 날씨 예보를 가져옵니다.
 */
async function getWeatherForecast(city: string, days: number): Promise<SimplifiedWeather[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn('OPENWEATHER_API_KEY is missing');
    return [];
  }

  // lang=kr 추가
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&lang=kr`;
  console.log(`Fetching weather for city: ${city}, URL: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

  const forecasts: SimplifiedWeather[] = [];

  try {
    const response = await axios.get<{ list: WeatherInfo[] }>(url);
    console.log(`Weather API Response Status: ${response.status}, Items: ${response.data.list?.length}`);

    for (let i = 1; i <= days; i++) {
      const targetDate = addDays(new Date(), i);
      const targetDateString = format(targetDate, 'yyyy-MM-dd');

      // 정오(12:00) 기준 예보 사용
      const dayForecast = response.data.list.find(item =>
        item.dt_txt.startsWith(targetDateString) && item.dt_txt.endsWith('12:00:00')
      );

      if (dayForecast) {
        const temp_celsius = parseFloat((dayForecast.main.temp - 273.15).toFixed(1));
        const main_condition = dayForecast.weather[0]?.main;
        let condition: SimplifiedWeather['condition'] = 'Other';

        if (['Rain', 'Snow', 'Clear', 'Clouds'].includes(main_condition)) {
          condition = main_condition as SimplifiedWeather['condition'];
        }

        forecasts.push({ date: targetDateString, temp_celsius, condition });
      } else {
        console.log(`No forecast found for date: ${targetDateString} 12:00:00`);
      }
    }
    console.log('Parsed Forecasts:', forecasts);
    return forecasts;
  } catch (error: any) {
    console.error('Failed to fetch weather forecast:', error.message);
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
    }
    return [];
  }
}

/**
 * 도시 이름 매핑
 */
async function getCityForWeather(storeId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { storeId }, select: { storeAddress: true } });
  if (!user?.storeAddress) return 'Seoul';

  const addr = user.storeAddress;
  if (addr.includes('서울')) return 'Seoul';
  if (addr.includes('부산')) return 'Busan';
  if (addr.includes('대구')) return 'Daegu';
  if (addr.includes('인천')) return 'Incheon';
  if (addr.includes('광주')) return 'Gwangju';
  if (addr.includes('대전')) return 'Daejeon';
  if (addr.includes('울산')) return 'Ulsan';
  if (addr.includes('제주')) return 'Jeju City';
  return 'Seoul'; // Default
}

/**
 * 표준편차 계산
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * 요일별 가중치 계산
 * @returns [일, 월, 화, 수, 목, 금, 토] 가중치 배열 (1.0 = 평균)
 */
function calculateDayOfWeekFactors(dailyUsages: number[], startDate: Date): number[] {
  const daySums = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  dailyUsages.forEach((usage, index) => {
    const date = addDays(startDate, index);
    const day = getDay(date); // 0 (Sun) ~ 6 (Sat)
    daySums[day] += usage;
    dayCounts[day]++;
  });

  const totalAvg = dailyUsages.reduce((a, b) => a + b, 0) / dailyUsages.length || 1;

  return daySums.map((sum, i) => {
    const dayAvg = dayCounts[i] > 0 ? sum / dayCounts[i] : 0;
    return dayAvg / totalAvg;
  });
}

/**
 * 날씨/기온 가중치 계산
 */
function calculateWeatherFactor(itemName: string, weather: SimplifiedWeather): { factor: number; reason?: string } {
  let factor = 1.0;
  let reasons: string[] = [];

  // 1. 기온 영향
  const isIceItem = /아이스|얼음|ICE|Cold/i.test(itemName);
  const isHotItem = /핫|따뜻|Hot|Warm/i.test(itemName);

  if (weather.temp_celsius >= 28) {
    if (isIceItem) {
      factor *= 1.3; // 폭염 시 아이스 30% 증가
      reasons.push('폭염으로 아이스 메뉴 수요 30% 증가 예상');
    }
    if (isHotItem) {
      factor *= 0.7;
      reasons.push('폭염으로 핫 메뉴 수요 30% 감소 예상');
    }
  } else if (weather.temp_celsius <= 10) {
    if (isIceItem) {
      factor *= 0.7;
      reasons.push('한파로 아이스 메뉴 수요 30% 감소 예상');
    }
    if (isHotItem) {
      factor *= 1.2; // 추운 날 핫 20% 증가
      reasons.push('추운 날씨로 핫 메뉴 수요 20% 증가 예상');
    }
  }

  // 2. 강수 영향
  if (weather.condition === 'Rain' || weather.condition === 'Snow') {
    // 일반적으로 내방객 감소 (배달 전문이 아니라고 가정)
    factor *= 0.9;
    reasons.push(`${weather.condition === 'Rain' ? '비' : '눈'} 소식으로 내방객 10% 감소 예상`);
  }

  return { factor, reason: reasons.join(', ') };
}

// --- Main Logic ---

export const generateRecommendations = async (storeId: string) => {
  console.log(`[Recommendation] Generating recommendations for storeId: ${storeId}`);
  const city = await getCityForWeather(storeId);
  console.log(`[Recommendation] City for weather: ${city}`);

  // 1. 날씨 예보 조회 (기본 5일 조회)
  const forecast = await getWeatherForecast(city, 5);

  // 한글 매핑 및 이모티콘
  const WEATHER_KO: Record<string, string> = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '☔',
    'Snow': '🌨️',
    'Other': '🌫️'
  };

  const forecastSummary = forecast.map(f =>
    `${format(new Date(f.date), 'M월 d일')} ${WEATHER_KO[f.condition] || f.condition} ${f.temp_celsius}°C`
  ).join(', ');

  const CITY_KO: Record<string, string> = {
    'Seoul': '서울',
    'Busan': '부산',
    'Daegu': '대구',
    'Incheon': '인천',
    'Gwangju': '광주',
    'Daejeon': '대전',
    'Ulsan': '울산',
    'Jeju City': '제주',
  };

  // 2. 자동 발주 대상 품목 조회
  const inventories = await prisma.inventory.findMany({
    where: { storeId, autoOrderEnabled: true },
    include: { suppliedBy: { include: { supplier: true } } },
  });

  console.log(`[Recommendation] Found ${inventories.length} auto-order enabled inventories.`);

  if (inventories.length === 0) {
    return {
      message: `${CITY_KO[city] || city}: ${forecastSummary}`,
      recommendations: []
    };
  }

  // 3. 최대 리드타임 계산
  const maxLeadTime = Math.max(...inventories.map(inv => inv.suppliedBy.reduce((max, s) => Math.max(max, s.leadTimeDays || 0), 0)), 1);
  console.log(`[Recommendation] Max lead time: ${maxLeadTime}`);

  // 4. 과거 사용량 데이터 분석
  const endDate = new Date();
  const startDate = subDays(endDate, ANALYSIS_DAYS);

  const orderItems = await prisma.orderItem.findMany({
    where: { order: { storeId, createdAt: { gte: startDate, lte: endDate } } },
    include: { order: true, product: { include: { inventoryUsages: true } } },
  });

  // 5. 품목별 데이터 집계 및 ABC 분류 준비
  const analysisData: InventoryAnalysisData[] = [];

  for (const inv of inventories) {
    // 일별 사용량 계산
    const dailyUsages = new Array(ANALYSIS_DAYS).fill(0);

    orderItems.forEach(oi => {
      const usageInfo = oi.product.inventoryUsages.find(u => u.inventoryId === inv.id);
      if (usageInfo) {
        const usagePerItem = convertToBaseUnit(usageInfo.usageAmount, usageInfo.usageUnit, inv.unit);
        const totalUsage = usagePerItem * oi.quantity;

        // 주문 날짜와 시작 날짜의 차이를 인덱스로 사용
        const diffDays = Math.floor((oi.order.createdAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < ANALYSIS_DAYS) {
          dailyUsages[diffDays] += totalUsage;
        }
      }
    });

    // 최적 공급업체 선정 (리드타임 짧은 순 -> 가격 싼 순)
    const bestSupplier = inv.suppliedBy.sort((a, b) => {
      if ((a.leadTimeDays || 99) !== (b.leadTimeDays || 99)) {
        return (a.leadTimeDays || 99) - (b.leadTimeDays || 99);
      }
      return (a.price || 999999) - (b.price || 999999);
    })[0];

    if (bestSupplier) {
      analysisData.push({
        id: inv.id,
        name: inv.name,
        unit: inv.unit,
        currentStock: inv.quantity,
        price: bestSupplier.price || 0,
        dailyUsages,
        leadTime: bestSupplier.leadTimeDays || 3, // Default 3 days
        supplierId: bestSupplier.supplier.id,
        supplierName: bestSupplier.supplier.name,
        minStockThreshold: inv.minStockThreshold || 0,
        packAmount: (bestSupplier as any).packAmount && (bestSupplier as any).packAmount !== 1.0
          ? (bestSupplier as any).packAmount
          : ((inv as any).packAmount || 1.0),
      });
    }
  }

  // 6. ABC 분류 수행 (사용 금액 기준)
  analysisData.sort((a, b) => {
    const usageValA = (a.dailyUsages.reduce((sum, val) => sum + val, 0) / ANALYSIS_DAYS) * a.price;
    const usageValB = (b.dailyUsages.reduce((sum, val) => sum + val, 0) / ANALYSIS_DAYS) * b.price;
    return usageValB - usageValA; // 내림차순
  });

  const totalValue = analysisData.reduce((sum, item) => {
    const avgDailyUsage = item.dailyUsages.reduce((s, v) => s + v, 0) / ANALYSIS_DAYS;
    return sum + (avgDailyUsage * item.price);
  }, 0);

  let accumulatedValue = 0;
  const abcMap = new Map<number, 'A' | 'B' | 'C'>();

  analysisData.forEach(item => {
    const avgDailyUsage = item.dailyUsages.reduce((s, v) => s + v, 0) / ANALYSIS_DAYS;
    const itemValue = avgDailyUsage * item.price;
    accumulatedValue += itemValue;

    const ratio = accumulatedValue / totalValue;
    if (ratio <= 0.7) abcMap.set(item.id, 'A'); // 상위 70% 가치 -> A
    else if (ratio <= 0.9) abcMap.set(item.id, 'B'); // 다음 20% -> B
    else abcMap.set(item.id, 'C'); // 나머지 10% -> C
  });

  // 7. 추천 수량 계산
  const recommendations = [];

  for (const item of analysisData) {
    const avgDailyUsage = item.dailyUsages.reduce((s, v) => s + v, 0) / ANALYSIS_DAYS;
    if (avgDailyUsage === 0) continue;

    const stdDev = calculateStandardDeviation(item.dailyUsages);
    const abcClass = abcMap.get(item.id) || 'C';
    const zScore = SERVICE_LEVEL_Z_SCORE[abcClass];

    // 동적 안전 재고 계산 (Dynamic Safety Stock)
    // Safety Stock = Z * StdDev * sqrt(LeadTime)
    const safetyStock = zScore * stdDev * Math.sqrt(item.leadTime);

    // 요일별 가중치 계산
    const dayFactors = calculateDayOfWeekFactors(item.dailyUsages, startDate);

    // 향후 리드타임 동안의 예상 사용량 계산
    let predictedUsageDuringLeadTime = 0;
    const today = new Date();
    let weatherReasons: string[] = [];

    for (let i = 1; i <= item.leadTime; i++) {
      const targetDate = addDays(today, i);
      const dayIndex = getDay(targetDate);
      const dayFactor = dayFactors[dayIndex];

      const targetDateStr = format(targetDate, 'yyyy-MM-dd');
      const weather = forecast.find(f => f.date === targetDateStr);

      let weatherFactor = 1.0;
      if (weather) {
        const result = calculateWeatherFactor(item.name, weather);
        weatherFactor = result.factor;
        if (result.reason) weatherReasons.push(result.reason);
      }

      predictedUsageDuringLeadTime += avgDailyUsage * dayFactor * weatherFactor;
    }

    // 목표 재고량 (Reorder Point) = 예상 사용량 + 안전 재고
    const reorderPoint = predictedUsageDuringLeadTime + safetyStock;

    if (item.currentStock < reorderPoint) {
      const orderAmount = reorderPoint - item.currentStock;

      // 발주 단위(Pack Amount) 적용
      // 1. SupplierInventory의 packAmount가 있으면 사용
      // 2. 없으면 Inventory의 packAmount 사용 (기본값 1.0)
      const packAmount = item.packAmount || 1.0;
      const recommendedPackCount = Math.ceil(orderAmount / packAmount);
      const finalOrderAmount = recommendedPackCount * packAmount;

      // 추천 사유 생성
      const uniqueWeatherReasons = Array.from(new Set(weatherReasons));
      const weatherReasonStr = uniqueWeatherReasons.length > 0 ? ` (${uniqueWeatherReasons.join(', ')})` : '';

      const reason = `${safetyStock.toFixed(1)}${item.unit} 확보 필요.${weatherReasonStr}`;

      recommendations.push({
        inventoryId: item.id,
        inventoryName: item.name,
        reason,
        currentStock: item.currentStock,
        unit: item.unit,
        predictedUsage: parseFloat((predictedUsageDuringLeadTime / item.leadTime).toFixed(2)),
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        leadTimeDays: item.leadTime,
        recommendedOrderAmount: finalOrderAmount,
        packAmount,
        recommendedPackCount,
      });
    }
  }

  return {
    message: `${CITY_KO[city] || city}: ${forecastSummary}`,
    recommendations,
  };
};
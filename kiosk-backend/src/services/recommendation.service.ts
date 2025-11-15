import axios from 'axios';
import prisma from '../db';
import { subDays } from 'date-fns';

// OpenWeatherMap API 응답에 대한 간단한 타입 정의
interface WeatherInfo {
  main: {
    temp: number; // 켈빈 온도
  };
  weather: {
    main: string; // e.g., "Clear", "Clouds", "Rain"
    description: string;
  }[];
  dt_txt: string; // 'YYYY-MM-DD HH:mm:ss'
}

// 우리가 사용할 정제된 날씨 정보 타입
export interface SimplifiedWeather {
  temp_celsius: number;
  condition: 'Rain' | 'Snow' | 'Clear' | 'Clouds' | 'Other';
}

/**
 * 지정된 도시의 다음 날 정오(12:00) 날씨 예보를 가져옵니다.
 * @param city 도시 이름 (영문)
 * @returns 정제된 날씨 정보
 */
async function getWeatherForecast(city: string): Promise<SimplifiedWeather | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error('OPENWEATHER_API_KEY is not set in .env file.');
    return null;
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;

  try {
    const response = await axios.get<{ list: WeatherInfo[] }>(url);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0];

    const nextDayForecast = response.data.list.find(item => {
      return item.dt_txt.startsWith(tomorrowDateString) && item.dt_txt.endsWith('12:00:00');
    });

    if (!nextDayForecast) {
      console.warn(`Could not find forecast for ${city} at noon tomorrow.`);
      return null;
    }

    const temp_kelvin = nextDayForecast.main.temp;
    const temp_celsius = parseFloat((temp_kelvin - 273.15).toFixed(1));
    const main_condition = nextDayForecast.weather[0]?.main;

    let condition: SimplifiedWeather['condition'] = 'Other';
    if (main_condition === 'Rain' || main_condition === 'Snow' || main_condition === 'Clear' || main_condition === 'Clouds') {
      condition = main_condition;
    }

    return {
      temp_celsius,
      condition,
    };

  } catch (error) {
    console.error('Failed to fetch weather forecast:', error);
    return null;
  }
}

export const generateRecommendations = async (storeId: string) => {
  const weather = await getWeatherForecast('Seoul');
  
  if (!weather) {
    return {
      message: "날씨 정보를 가져올 수 없어 추천을 생성할 수 없습니다.",
      recommendations: [],
    };
  }

  const KEY_INVENTORY_ITEM_NAME = '원두';
  const ANALYSIS_DAYS = 28; // 4주

  // 1. 핵심 재고 품목 정보 조회
  const inventoryItem = await prisma.inventory.findFirst({
    where: { name: KEY_INVENTORY_ITEM_NAME, storeId },
  });

  if (!inventoryItem) {
    return { message: `'${KEY_INVENTORY_ITEM_NAME}' 품목을 찾을 수 없습니다.`, recommendations: [] };
  }

  // 2. 해당 재고를 사용하는 제품들 조회
  const productUsages = await prisma.productInventoryUsage.findMany({
    where: { inventoryId: inventoryItem.id },
    select: { productId: true, usageAmount: true },
  });

  if (productUsages.length === 0) {
    return { message: `'${KEY_INVENTORY_ITEM_NAME}'을 사용하는 제품이 없습니다.`, recommendations: [] };
  }

  const productIds = productUsages.map(p => p.productId);

  // 3. 지난 N일간의 판매 데이터로 일 평균 소모량 계산
  const pastOrders = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId,
        createdAt: { gte: subDays(new Date(), ANALYSIS_DAYS) },
      },
      productId: { in: productIds },
    },
  });

  const totalUsage = pastOrders.reduce((acc, orderItem) => {
    const usageInfo = productUsages.find(p => p.productId === orderItem.productId);
    return acc + (usageInfo ? usageInfo.usageAmount * orderItem.quantity : 0);
  }, 0);

  const baselineDailyUsage = totalUsage / ANALYSIS_DAYS;

  // 4. 날씨 기반 규칙 적용하여 수요 예측
  let predictedUsage = baselineDailyUsage;
  let reason = `지난 ${ANALYSIS_DAYS}일간의 평균 소모량`;

  if (weather.condition === 'Rain') {
    predictedUsage *= 1.2; // 비 오는 날 20% 증가
    reason = `비 예보로 인해 평소보다 20% 증가된 수요가 예상됩니다.`;
  }
  // 여기에 다른 규칙 추가 가능 (e.g., 온도, 주말 등)

  // 5. 최적 공급처 탐색 (리드타임이 가장 짧은)
  const bestSupplierInfo = await prisma.supplierInventory.findFirst({
    where: { inventoryId: inventoryItem.id },
    orderBy: { leadTimeDays: 'asc' },
    include: { supplier: true },
  });

  if (!bestSupplierInfo || bestSupplierInfo.leadTimeDays === null) {
    return { message: `'${inventoryItem.name}'의 공급처 정보(리드타임)가 부족합니다.`, recommendations: [] };
  }

  // 6. 발주 필요 여부 판단
  const leadTime = bestSupplierInfo.leadTimeDays;
  const stockAtDelivery = inventoryItem.quantity - (predictedUsage * leadTime);
  const safetyStock = inventoryItem.minStockThreshold || 0;

  const recommendations = [];

  if (stockAtDelivery < safetyStock) {
    const targetStock = safetyStock * 2; // 목표 재고량 (안전 재고의 2배)
    const recommendedOrderAmount = Math.max(0, targetStock - stockAtDelivery);

    recommendations.push({
      inventoryId: inventoryItem.id,
      inventoryName: inventoryItem.name,
      reason,
      currentStock: inventoryItem.quantity,
      unit: inventoryItem.unit,
      predictedUsage: parseFloat(predictedUsage.toFixed(2)),
      supplierId: bestSupplierInfo.supplier.id,
      supplierName: bestSupplierInfo.supplier.name,
      leadTimeDays: leadTime,
      recommendedOrderAmount: parseFloat(recommendedOrderAmount.toFixed(2)),
    });
  }

  return {
    message: `내일 서울의 예상 날씨는 ${weather.temp_celsius}°C, ${weather.condition} 입니다.`,
    recommendations,
  };
};

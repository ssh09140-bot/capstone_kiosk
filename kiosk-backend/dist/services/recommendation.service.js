"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecommendations = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../db"));
const unitConversionService_1 = require("./unitConversionService");
const date_fns_1 = require("date-fns");
/**
 * 지정된 도시의 향후 N일간의 정오(12:00) 날씨 예보를 가져옵니다.
 * @param city 도시 이름 (영문)
 * @param days 예보를 가져올 일수 (최대 5)
 * @returns 일별 예보 정보 배열
 */
async function getWeatherForecast(city, days) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.error('OPENWEATHER_API_KEY is not set in .env file.');
        return [];
    }
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;
    const forecasts = [];
    try {
        const response = await axios_1.default.get(url);
        for (let i = 1; i <= days; i++) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + i);
            const targetDateString = targetDate.toISOString().split('T')[0];
            const dayForecast = response.data.list.find(item => {
                return item.dt_txt.startsWith(targetDateString) && item.dt_txt.endsWith('12:00:00');
            });
            if (dayForecast) {
                const temp_kelvin = dayForecast.main.temp;
                const temp_celsius = parseFloat((temp_kelvin - 273.15).toFixed(1));
                const main_condition = dayForecast.weather[0]?.main;
                let condition = 'Other';
                if (main_condition === 'Rain' || main_condition === 'Snow' || main_condition === 'Clear' || main_condition === 'Clouds') {
                    condition = main_condition;
                }
                forecasts.push({
                    date: targetDateString,
                    temp_celsius,
                    condition,
                });
            }
        }
        return forecasts;
    }
    catch (error) {
        console.error('Failed to fetch weather forecast:', error);
        return [];
    }
}
const generateRecommendations = async (storeId) => {
    const user = await db_1.default.user.findUnique({ where: { storeId }, select: { storeAddress: true } });
    let cityForWeather = 'Seoul';
    if (user?.storeAddress) {
        const fullAddress = user.storeAddress.trim();
        if (fullAddress.includes('서울'))
            cityForWeather = 'Seoul';
        else if (fullAddress.includes('부산'))
            cityForWeather = 'Busan';
        else if (fullAddress.includes('대구'))
            cityForWeather = 'Daegu';
        else if (fullAddress.includes('인천'))
            cityForWeather = 'Incheon';
        else if (fullAddress.includes('광주'))
            cityForWeather = 'Gwangju';
        else if (fullAddress.includes('대전'))
            cityForWeather = 'Daejeon';
        else if (fullAddress.includes('울산'))
            cityForWeather = 'Ulsan';
        else if (fullAddress.includes('세종'))
            cityForWeather = 'Sejong';
        else if (fullAddress.includes('경기'))
            cityForWeather = 'Suwon';
        else if (fullAddress.includes('강원'))
            cityForWeather = 'Chuncheon';
        else if (fullAddress.includes('충북'))
            cityForWeather = 'Cheongju';
        else if (fullAddress.includes('충남'))
            cityForWeather = 'Cheonan';
        else if (fullAddress.includes('전북'))
            cityForWeather = 'Jeonju';
        else if (fullAddress.includes('전남'))
            cityForWeather = 'Mokpo';
        else if (fullAddress.includes('경북'))
            cityForWeather = 'Pohang';
        else if (fullAddress.includes('경남'))
            cityForWeather = 'Changwon';
        else if (fullAddress.includes('제주'))
            cityForWeather = 'Jeju City';
    }
    const ANALYSIS_DAYS = 28;
    const allRecommendations = [];
    const autoOrderEnabledInventories = await db_1.default.inventory.findMany({
        where: { storeId, autoOrderEnabled: true },
        include: { suppliedBy: { include: { supplier: true } } },
    });
    if (autoOrderEnabledInventories.length === 0)
        return { message: "자동 발주가 활성화된 재고 품목이 없습니다.", recommendations: [] };
    const maxLeadTime = Math.max(...autoOrderEnabledInventories.map(inv => inv.suppliedBy.reduce((max, s) => Math.max(max, s.leadTimeDays || 0), 0)), 1);
    const forecast = await getWeatherForecast(cityForWeather, Math.min(maxLeadTime, 5)); // API는 최대 5일 예보 제공
    if (forecast.length === 0) {
        return { message: "날씨 예보를 가져올 수 없어 추천을 생성할 수 없습니다.", recommendations: [] };
    }
    const endDate = new Date();
    const startDate = (0, date_fns_1.subDays)(endDate, ANALYSIS_DAYS);
    const allPastOrderItems = await db_1.default.orderItem.findMany({
        where: { order: { storeId, createdAt: { gte: startDate, lte: endDate } } },
        include: { order: true, product: { include: { inventoryUsages: true } } },
    });
    const dailyWeather = new Map();
    allPastOrderItems.forEach(item => {
        const dateStr = (0, date_fns_1.format)(item.order.createdAt, 'yyyy-MM-dd');
        if (!dailyWeather.has(dateStr))
            dailyWeather.set(dateStr, item.order.weather);
    });
    const totalRainyDays = [...dailyWeather.values()].filter(w => w === 'Rain').length;
    const totalAnalysisDays = dailyWeather.size || ANALYSIS_DAYS;
    for (const inventoryItem of autoOrderEnabledInventories) {
        const relevantOrderItems = allPastOrderItems.filter(oi => oi.product.inventoryUsages.some(u => u.inventoryId === inventoryItem.id));
        if (relevantOrderItems.length === 0)
            continue;
        let totalUsage = 0;
        let rainyDayUsage = 0;
        relevantOrderItems.forEach(orderItem => {
            const usageInfo = orderItem.product.inventoryUsages.find(u => u.inventoryId === inventoryItem.id);
            if (usageInfo) {
                const usageAmount = (0, unitConversionService_1.convertToBaseUnit)(usageInfo.usageAmount, usageInfo.usageUnit, inventoryItem.unit) * orderItem.quantity;
                totalUsage += usageAmount;
                if (orderItem.order.weather === 'Rain')
                    rainyDayUsage += usageAmount;
            }
        });
        const baselineDailyUsage = totalUsage / totalAnalysisDays;
        if (baselineDailyUsage === 0)
            continue;
        const COLD_START_THRESHOLD_DAYS = 14; // 콜드 스타트 임계값 (일)
        const COLD_START_RAIN_MULTIPLIER = 1.15; // 콜드 스타트 시 비 오는 날 판매량 15% 증가
        let rainMultiplier = 1.0;
        let currentReason = `지난 ${totalAnalysisDays}일간의 평균 소모량 기준`;
        if (totalAnalysisDays < COLD_START_THRESHOLD_DAYS) {
            // 콜드 스타트: 데이터가 부족하면 미리 정의된 규칙 사용
            rainMultiplier = COLD_START_RAIN_MULTIPLIER;
            currentReason = `신규 매장으로 ${COLD_START_THRESHOLD_DAYS}일 미만 데이터, 기본 날씨 규칙 적용 (비 예보 시 ${((COLD_START_RAIN_MULTIPLIER - 1) * 100).toFixed(0)}% 수요 증가)`;
        }
        else {
            // 데이터가 충분하면 데이터 기반 규칙 사용
            const rainyDayDailyUsage = totalRainyDays > 0 ? rainyDayUsage / totalRainyDays : baselineDailyUsage;
            if (baselineDailyUsage > 0 && totalRainyDays > 0) {
                rainMultiplier = rainyDayDailyUsage / baselineDailyUsage;
                currentReason = `비 예보로 인해 평소 대비 ${((rainMultiplier - 1) * 100).toFixed(0)}% 수요 변화가 예상됩니다.`;
            }
        }
        const bestSupplierInfo = inventoryItem.suppliedBy.sort((a, b) => (a.leadTimeDays || 99) - (b.leadTimeDays || 99))[0];
        if (!bestSupplierInfo || bestSupplierInfo.leadTimeDays === null)
            continue;
        const leadTime = bestSupplierInfo.leadTimeDays;
        let totalPredictedUsageDuringLeadTime = 0;
        let reason = currentReason; // 초기 reason 설정
        for (let i = 0; i < leadTime; i++) {
            const futureDate = (0, date_fns_1.addDays)(new Date(), i + 1);
            const futureDateStr = (0, date_fns_1.format)(futureDate, 'yyyy-MM-dd');
            const dayForecast = forecast.find(f => f.date === futureDateStr);
            let dailyMultiplier = 1.0;
            if (dayForecast?.condition === 'Rain') {
                dailyMultiplier = rainMultiplier;
            }
            // 요일, 온도 등 다른 규칙 추가 가능
            totalPredictedUsageDuringLeadTime += baselineDailyUsage * dailyMultiplier;
        }
        const stockAtDelivery = inventoryItem.quantity - totalPredictedUsageDuringLeadTime;
        const safetyStock = inventoryItem.minStockThreshold || 0;
        if (stockAtDelivery < safetyStock) {
            const targetStock = safetyStock * 2;
            const recommendedOrderAmount = Math.max(0, targetStock - stockAtDelivery);
            allRecommendations.push({
                inventoryId: inventoryItem.id,
                inventoryName: inventoryItem.name,
                reason,
                currentStock: inventoryItem.quantity,
                unit: inventoryItem.unit,
                predictedUsage: parseFloat((totalPredictedUsageDuringLeadTime / leadTime).toFixed(2)), // 일 평균으로 변환하여 표시
                supplierId: bestSupplierInfo.supplier.id,
                supplierName: bestSupplierInfo.supplier.name,
                leadTimeDays: leadTime,
                recommendedOrderAmount: parseFloat(recommendedOrderAmount.toFixed(2)),
            });
        }
    }
    const forecastSummary = forecast.map(f => {
        const date = new Date(f.date);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `[${month}/${day} ${f.condition} ${f.temp_celsius}°C]`;
    }).join(', ');
    return {
        message: `${cityForWeather}의 향후 ${forecast.length}일간 날씨 예보: ${forecastSummary}.`,
        recommendations: allRecommendations,
    };
};
exports.generateRecommendations = generateRecommendations;

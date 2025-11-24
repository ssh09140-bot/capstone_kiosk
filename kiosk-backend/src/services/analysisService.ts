import prisma from '../db';
import { subDays, format } from 'date-fns';

interface DailySales {
    date: string;
    temperature: number;
    quantity: number;
}

interface AnalysisResult {
    stats: {
        sensitivity: number; // Slope (m)
        intercept: number;   // Y-intercept (b)
        correlation: number; // Correlation coefficient (r)
    };
    data: DailySales[];
    recommendation: string;
}

/**
 * Calculates the linear regression and correlation between temperature and sales.
 * @param productId The ID of the product to analyze.
 * @param days Number of days to analyze (default: 90).
 */
export async function getProductTemperatureAnalysis(productId: string, days: number = 90): Promise<AnalysisResult> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // 1. Fetch daily sales and weather data
    const orderItems = await prisma.orderItem.findMany({
        where: {
            productId: parseInt(productId), // Ensure ID is integer if schema uses Int
            order: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        },
        include: {
            order: {
                select: {
                    createdAt: true,
                    weather: true,
                    temperature: true,
                },
            },
        },
    });

    // Group by date
    const salesMap = new Map<string, number>();
    const weatherMap = new Map<string, number>(); // Date -> Temp

    orderItems.forEach(item => {
        const dateStr = format(item.order.createdAt, 'yyyy-MM-dd');
        salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + item.quantity);

        // Use actual temperature if available, otherwise mock it
        if (!weatherMap.has(dateStr)) {
            if (item.order.temperature !== null) {
                weatherMap.set(dateStr, item.order.temperature);
            } else {
                // Fallback mock logic
                const date = new Date(dateStr);
                const month = date.getMonth() + 1;
                let baseTemp = 20;
                if (month >= 6 && month <= 8) baseTemp = 30;
                else if (month >= 12 || month <= 2) baseTemp = 5;
                else baseTemp = 15;

                const variation = (date.getDate() % 10) - 5;
                weatherMap.set(dateStr, baseTemp + variation);
            }
        }
    });

    // Prepare data points
    const data: DailySales[] = [];
    const dateIterator = new Date(startDate);

    while (dateIterator <= endDate) {
        const dateStr = format(dateIterator, 'yyyy-MM-dd');
        const quantity = salesMap.get(dateStr) || 0;
        const temperature = weatherMap.get(dateStr) || 20; // Default fallback

        data.push({ date: dateStr, temperature, quantity });
        dateIterator.setDate(dateIterator.getDate() + 1);
    }

    // 2. Perform Linear Regression
    const n = data.length;
    if (n < 2) {
        return {
            stats: { sensitivity: 0, intercept: 0, correlation: 0 },
            data,
            recommendation: "데이터가 부족하여 분석할 수 없습니다.",
        };
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    data.forEach(d => {
        const x = d.temperature;
        const y = d.quantity;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Correlation Coefficient (r)
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    // 3. Generate Recommendation
    let recommendation = "";
    const sensitivity = slope;

    if (correlation > 0.5) {
        recommendation = `이 상품은 기온과 강한 양의 상관관계(r=${correlation.toFixed(2)})가 있습니다. 기온이 1°C 오를 때마다 판매량이 약 ${sensitivity.toFixed(1)}개 증가할 것으로 예상됩니다. 더운 날 발주를 늘리세요.`;
    } else if (correlation < -0.5) {
        recommendation = `이 상품은 기온과 강한 음의 상관관계(r=${correlation.toFixed(2)})가 있습니다. 기온이 오르면 판매량이 감소하는 경향이 있습니다.`;
    } else {
        recommendation = `이 상품은 기온의 영향을 크게 받지 않습니다(r=${correlation.toFixed(2)}). 평소 판매량을 기준으로 발주하세요.`;
    }

    return {
        stats: { sensitivity, intercept, correlation },
        data,
        recommendation,
    };
}

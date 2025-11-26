"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLowStockNotification = generateLowStockNotification;
exports.generateSalesAnalysis = generateSalesAnalysis;
exports.generateHygieneCheck = generateHygieneCheck;
const openai_1 = __importDefault(require("openai"));
const https_1 = __importDefault(require("https")); // SSL 인증서 검증 비활성화를 위한 https 모듈
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in the environment variables.');
}
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: new https_1.default.Agent({
        rejectUnauthorized: false, // SSL 인증서 검증 비활성화 (개발 환경용)
    }),
});
const AI_MODEL = 'gpt-3.5-turbo';
/**
 * Generates a notification message for a product with low stock.
 * @param productName The name of the product.
 * @param stock The remaining stock quantity.
 * @returns The generated notification message, or null if an error occurs.
 */
async function generateLowStockNotification(productName, stock) {
    const prompt = `A product in our kiosk is running low on stock.
Product Name: ${productName}
Remaining Stock: ${stock}

Please generate a short, friendly, and urgent notification message for the store manager in Korean. The message should encourage them to reorder soon.
Example: "매니저님, '${productName}' 재고가 ${stock}개밖에 남지 않았어요. 곧 품절될 것 같아요! 서둘러 발주를 넣어주세요."`;
    try {
        const response = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant for a kiosk store manager.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 150,
        });
        return response.choices[0].message.content?.trim() ?? null;
    }
    catch (error) {
        console.error('Error generating OpenAI notification:', error);
        return null;
    }
}
/**
 * Generates a sales analysis and suggestions based on best and worst selling products.
 * @param bestSeller The best selling product.
 * @param worstSeller The worst selling product.
 * @returns The generated analysis and suggestion, or null if an error occurs.
 */
async function generateSalesAnalysis(bestSeller, worstSeller) {
    const prompt = `Our kiosk had the following sales results over the last month:

- Best-selling product: ${bestSeller.name} (Sold ${bestSeller.totalQuantity} units)
- Worst-selling product: ${worstSeller.name} (Sold ${worstSeller.totalQuantity} units)

Please generate a concise, data-driven, and actionable suggestion for our store manager in Korean.
IMPORTANT: Use the terms '인기 상품' instead of 'Best-selling product' and '비인기 상품' instead of 'Worst-selling product'.

The suggestion should have two parts:
1. A suggestion to enhance the '인기 상품' (Best-selling product), for example, by adding a new option (e.g., '치즈 추가' or '사이즈 업').
2. A suggestion to consider removing or replacing the '비인기 상품' (Worst-selling product).

Keep the tone friendly and professional.
Structure the output clearly with bullet points or numbered lists and use line breaks for better readability.`;
    try {
        const response = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert business analyst providing advice to a kiosk store manager.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.8,
            max_tokens: 1000,
        });
        return response.choices[0].message.content?.trim() ?? null;
    }
    catch (error) {
        console.error('Error generating sales analysis:', error);
        return null;
    }
}
/**
 * Generates a hygiene check recommendation based on recent orders.
 * @param recentOrders List of recent orders (name, quantity, options).
 * @returns Hygiene check result (status, reason, recommendation).
 */
async function generateHygieneCheck(recentOrders) {
    const ordersSummary = recentOrders.map(o => `- ${o.productName} (${o.quantity}잔) [옵션: ${o.options || '없음'}]`).join('\n');
    const prompt = `
You are an "AI Hygiene Manager" for an unmanned cafe.
Analyze the following recent order history (last 3 hours) and determine if the store needs cleaning.

[Recent Orders]
${ordersSummary}

[Analysis Criteria]
1. **Powder/Syrup/Smoothie**: High risk of spills and stickiness.
2. **Take-out**: High risk of overflowing trash bins.
3. **Order Volume**: High volume means general messiness.

[Output Format]
Please provide the output in JSON format with the following keys:
- "status": "양호" (Good), "주의" (Caution), or "심각" (Critical)
- "reason": A short explanation of why (e.g., "파우더 음료 주문 집중", "테이크아웃 컵 쓰레기 예상").
- "message": A friendly message to the owner recommending action (e.g., "30분 내 방문 권장", "물티슈 보충 필요").

IMPORTANT: Respond ONLY with the JSON object.
`;
    try {
        const response = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant for store hygiene management. Output JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 300,
        });
        return response.choices[0].message.content?.trim() ?? null;
    }
    catch (error) {
        console.error('Error generating hygiene check:', error);
        return null;
    }
}

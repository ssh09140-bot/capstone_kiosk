import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in the environment variables.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_MODEL = 'gpt-3.5-turbo';

/**
 * Generates a notification message for a product with low stock.
 * @param productName The name of the product.
 * @param stock The remaining stock quantity.
 * @returns The generated notification message, or null if an error occurs.
 */
export async function generateLowStockNotification(productName: string, stock: number): Promise<string | null> {
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
  } catch (error) {
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
export async function generateSalesAnalysis(bestSeller: any, worstSeller: any): Promise<string | null> {
  const prompt = `Our kiosk had the following sales results over the last month:

- Best-selling product: ${bestSeller.name} (Sold ${bestSeller.totalQuantity} units)
- Worst-selling product: ${worstSeller.name} (Sold ${worstSeller.totalQuantity} units)

Please generate a concise, data-driven, and actionable suggestion for our store manager in Korean. The suggestion should have two parts:
1. A suggestion to enhance the best-selling product, for example, by adding a new option (e.g., '치즈 추가' or '사이즈 업').
2. A suggestion to consider removing or replacing the worst-selling product.

Keep the tone friendly and professional. Structure the output clearly.`;

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
      max_tokens: 400,
    });

    return response.choices[0].message.content?.trim() ?? null;
  } catch (error) {
    console.error('Error generating sales analysis:', error);
    return null;
  }
}

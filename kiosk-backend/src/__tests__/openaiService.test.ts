import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Define the mock function that will be used in the mock
const mockCreate = jest.fn();

// Mock the entire 'openai' library
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  });
});

describe('OpenAI Service', () => {
  let generateLowStockNotification: (productName: string, stock: number) => Promise<string | null>;

  beforeAll(async () => {
    // Dynamically import the service to ensure mocks are applied first
    const service = await import('../services/openaiService');
    generateLowStockNotification = service.generateLowStockNotification;
  });

  beforeEach(() => {
    // Clear mock history before each test
    mockCreate.mockClear();
    // Set a default mock response for the AI
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'AI-generated test message' } }],
    });
  });

  describe('generateLowStockNotification', () => {
    it('should call the OpenAI API with the correct prompt', async () => {
      const productName = '테스트 콜라';
      const stock = 5;

      await generateLowStockNotification(productName, stock);

      // 1. Check if the create function was called
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // 2. Check if the prompt contains the correct product name and stock
      const calledWith = mockCreate.mock.calls[0][0];
      const userPrompt = calledWith.messages.find((m: ChatCompletionMessageParam) => m.role === 'user').content;

      expect(userPrompt).toContain(productName);
      expect(userPrompt).toContain(`Remaining Stock: ${stock}`);
      expect(calledWith.model).toBe('gpt-3.5-turbo');
    });

    it('should return the message content from the AI response', async () => {
      const result = await generateLowStockNotification('Some Product', 1);
      expect(result).toBe('AI-generated test message');
    });

    it('should return null if the OpenAI API call fails', async () => {
      // Override the default mock to simulate an error
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await generateLowStockNotification('Error Product', 1);
      expect(result).toBeNull();
    });
  });
});

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
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
    let generateLowStockNotification;
    beforeAll(async () => {
        // Dynamically import the service to ensure mocks are applied first
        const service = await Promise.resolve().then(() => __importStar(require('../services/openaiService')));
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
            const userPrompt = calledWith.messages.find((m) => m.role === 'user').content;
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

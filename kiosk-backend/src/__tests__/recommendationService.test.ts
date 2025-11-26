import { generateRecommendations } from '../services/recommendation.service';
import prisma from '../db';
import axios from 'axios';

// Prisma Mocking
jest.mock('../db', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
        },
        inventory: {
            findMany: jest.fn(),
        },
        orderItem: {
            findMany: jest.fn(),
        },
    },
}));

jest.mock('axios');

describe('Recommendation Service', () => {
    const mockStoreId = 'store-123';

    beforeEach(() => {
        jest.clearAllMocks();

        // Default Mocks
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ storeAddress: 'Seoul' });

        // Default Weather Mock (Normal)
        (axios.get as jest.Mock).mockResolvedValue({
            data: {
                list: [
                    { dt_txt: '2025-11-27 12:00:00', main: { temp: 293.15 }, weather: [{ main: 'Clear' }] }, // 20°C
                    { dt_txt: '2025-11-28 12:00:00', main: { temp: 293.15 }, weather: [{ main: 'Clear' }] },
                    { dt_txt: '2025-11-29 12:00:00', main: { temp: 293.15 }, weather: [{ main: 'Clear' }] },
                    { dt_txt: '2025-11-30 12:00:00', main: { temp: 293.15 }, weather: [{ main: 'Clear' }] },
                    { dt_txt: '2025-12-01 12:00:00', main: { temp: 293.15 }, weather: [{ main: 'Clear' }] },
                ],
            },
        });
    });

    it('should recommend ordering ice items when temperature is high (30°C)', async () => {
        // Mock Weather (Hot)
        (axios.get as jest.Mock).mockResolvedValue({
            data: {
                list: Array(5).fill(null).map((_, i) => ({
                    dt_txt: `2025-11-${27 + i} 12:00:00`,
                    main: { temp: 303.15 }, // 30°C
                    weather: [{ main: 'Clear' }],
                })),
            },
        });

        // Mock Inventory (Ice)
        (prisma.inventory.findMany as jest.Mock).mockResolvedValue([
            {
                id: 1,
                name: '얼음',
                quantity: 10,
                unit: 'kg',
                autoOrderEnabled: true,
                suppliedBy: [{ leadTimeDays: 1, price: 1000, supplier: { id: 1, name: 'Supplier A' } }],
            },
        ]);

        // Mock Usage
        (prisma.orderItem.findMany as jest.Mock).mockResolvedValue([
            {
                quantity: 10,
                order: { createdAt: new Date() },
                product: { inventoryUsages: [{ inventoryId: 1, usageAmount: 1, usageUnit: 'kg' }] },
            },
        ]);

        const result = await generateRecommendations(mockStoreId);

        expect(result.recommendations).toHaveLength(1);
        expect(result.recommendations[0].inventoryName).toBe('얼음');
        // High temp factor should increase predicted usage
        expect(result.recommendations[0].predictedUsage).toBeGreaterThan(10);
    });

    it('should apply ABC classification correctly', async () => {
        // Mock Inventories
        (prisma.inventory.findMany as jest.Mock).mockResolvedValue([
            {
                id: 1,
                name: 'Expensive Bean',
                quantity: 0,
                unit: 'kg',
                autoOrderEnabled: true,
                suppliedBy: [{ leadTimeDays: 1, price: 50000, supplier: { id: 1, name: 'A' } }],
            },
            {
                id: 2,
                name: 'Cheap Cup',
                quantity: 0,
                unit: 'ea',
                autoOrderEnabled: true,
                suppliedBy: [{ leadTimeDays: 1, price: 50, supplier: { id: 2, name: 'B' } }],
            },
        ]);

        // Mock Usage (Same usage)
        (prisma.orderItem.findMany as jest.Mock).mockResolvedValue([
            {
                quantity: 1,
                order: { createdAt: new Date() },
                product: { inventoryUsages: [{ inventoryId: 1, usageAmount: 1, usageUnit: 'kg' }] },
            },
            {
                quantity: 1,
                order: { createdAt: new Date() },
                product: { inventoryUsages: [{ inventoryId: 2, usageAmount: 1, usageUnit: 'ea' }] },
            },
        ]);

        const result = await generateRecommendations(mockStoreId);

        const beanRec = result.recommendations.find((r: any) => r.inventoryId === 1);
        const cupRec = result.recommendations.find((r: any) => r.inventoryId === 2);

        expect(beanRec!.reason).toContain('A등급');
        expect(cupRec!.reason).toContain('C등급');
    });
});

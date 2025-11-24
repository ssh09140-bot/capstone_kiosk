const { PrismaClient } = require('@prisma/client');
const { subDays, addDays, format } = require('date-fns');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding weather analysis data...');

    // 1. Find or Create "Ice Americano" (High sensitivity product)
    let iceAmericano = await prisma.product.findFirst({
        where: { name: { contains: '아메리카노' } },
    });

    if (!iceAmericano) {
        console.log('Creating Ice Americano product...');
        const category = await prisma.category.findFirst();
        if (!category) throw new Error('No category found. Please create one first.');

        iceAmericano = await prisma.product.create({
            data: {
                name: '아이스 아메리카노',
                price: 4500,
                categoryId: category.id,
                storeId: category.storeId,
                stock: 1000, // Added stock as it is required or default
            },
        });
    }

    console.log(`Target Product: ${iceAmericano.name} (${iceAmericano.id})`);

    // 2. Generate 90 days of data
    const storeId = iceAmericano.storeId;
    const today = new Date();
    const startDate = subDays(today, 90);

    for (let i = 0; i < 90; i++) {
        const date = addDays(startDate, i);
        const month = date.getMonth() + 1;

        // Simulate Temperature (Seasonality + Randomness)
        let baseTemp = 20;
        if (month >= 6 && month <= 8) baseTemp = 30; // Summer
        else if (month >= 12 || month <= 2) baseTemp = 5; // Winter
        else baseTemp = 18; // Spring/Fall

        const tempVariation = (Math.random() * 10) - 5;
        const temperature = Math.round(baseTemp + tempVariation);

        // Simulate Sales Quantity based on Temperature (Positive Correlation)
        // Base sales: 10
        // +1 sale per 1°C above 10°C
        // Random variation +/- 5
        let quantity = 10 + Math.max(0, (temperature - 10) * 1.5) + (Math.random() * 10 - 5);
        quantity = Math.max(5, Math.round(quantity));

        // Create Order
        // Note: Order model does NOT have 'status' or 'paymentMethod' based on verification.
        const order = await prisma.order.create({
            data: {
                storeId,
                totalAmount: quantity * iceAmericano.price,
                createdAt: date,
                weather: temperature > 25 ? 'Clear' : (temperature < 5 ? 'Snow' : 'Clouds'),
                temperature: temperature,
            },
        });

        // Create Order Item
        await prisma.orderItem.create({
            data: {
                orderId: order.id,
                productId: iceAmericano.id,
                quantity: Math.round(quantity),
                pricePerItem: iceAmericano.price,
            },
        });

        if (i % 10 === 0) process.stdout.write('.');
    }

    console.log('\n✅ Seeding completed!');
}

main()
    .catch((e) => {
        console.error("FATAL ERROR:", JSON.stringify(e, null, 2));
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

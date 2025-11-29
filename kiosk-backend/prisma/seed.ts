import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcryptjs';  <-- 비밀번호 해싱 필요 없음

const prisma = new PrismaClient();

// Helper function to get a random item from an array
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to generate a random number within a range
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Start seeding...');

  // 1. Clean up existing data
  await prisma.orderItem.deleteMany({});
  await prisma.option.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.optionGroup.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create a single user for the store
  // Firebase를 쓰므로 비밀번호 해싱 과정 삭제

  const user = await prisma.user.create({
    data: {
      email: 'store-owner@test.com',
      // password: hashedPassword, <-- 이 줄 삭제됨 (DB에 컬럼이 없음)
      storeName: 'My Awesome Kiosk',
      firebaseUid: 'H7rwGsgdUPPYcmJBNn9280A2Ank1',
    },
  });
  console.log(`Created user: ${user.email} with storeId: ${user.storeId} and FirebaseUID linked.`);

  // 3. Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Coffee', storeId: user.storeId } }),
    prisma.category.create({ data: { name: 'Juice', storeId: user.storeId } }),
    prisma.category.create({ data: { name: 'Bakery', storeId: user.storeId } }),
  ]);
  console.log(`Created ${categories.length} categories.`);

  // 4. Create products
  const products = await Promise.all([
    // Coffee
    prisma.product.create({ data: { name: '아메리카노', price: 3000, stock: 100, categoryId: categories[0].id, storeId: user.storeId, imageUrl: '' } }),
    prisma.product.create({ data: { name: '카페라떼', price: 3500, stock: 100, categoryId: categories[0].id, storeId: user.storeId, imageUrl: '' } }),
    prisma.product.create({ data: { name: '바닐라라떼', price: 4000, stock: 100, categoryId: categories[0].id, storeId: user.storeId, imageUrl: '' } }),
    // Juice
    prisma.product.create({ data: { name: '오렌지주스', price: 4500, stock: 50, categoryId: categories[1].id, storeId: user.storeId, imageUrl: '' } }),
    prisma.product.create({ data: { name: '딸기주스', price: 4500, stock: 50, categoryId: categories[1].id, storeId: user.storeId, imageUrl: '' } }),
    // Bakery
    prisma.product.create({ data: { name: '크루아상', price: 2500, stock: 30, categoryId: categories[2].id, storeId: user.storeId, imageUrl: '' } }),
    prisma.product.create({ data: { name: '소금빵', price: 2800, stock: 30, categoryId: categories[2].id, storeId: user.storeId, imageUrl: '' } }),
  ]);
  console.log(`Created ${products.length} products.`);

  // 5. Generate orders for the past 90 days
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // Create a random number of orders for the day
    const ordersPerDay = getRandomInt(5, 20);
    for (let j = 0; j < ordersPerDay; j++) {
      const itemsInOrder = getRandomInt(1, 4);
      const orderItemsData = [];
      let totalAmount = 0;

      for (let k = 0; k < itemsInOrder; k++) {
        const product = getRandomItem(products);
        const quantity = getRandomInt(1, 3);
        const pricePerItem = product.price;
        totalAmount += pricePerItem * quantity;

        orderItemsData.push({
          productId: product.id,
          quantity: quantity,
          pricePerItem: pricePerItem,
        });
      }

      // Create the order with its items
      await prisma.order.create({
        data: {
          storeId: user.storeId,
          totalAmount: totalAmount,
          createdAt: date,
          orderItems: {
            create: orderItemsData,
          },
        },
      });
    }
  }
  console.log('Finished generating orders.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
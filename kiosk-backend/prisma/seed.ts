
import { PrismaClient, Inventory, Product } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper function to get a random item from an array
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to generate a random number within a range
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simple unit conversion helper (copied from service to avoid import issues in seed)
const conversionFactors: { [unit: string]: { base: string; factor: number } } = {
  g: { base: 'kg', factor: 0.001 },
  kg: { base: 'kg', factor: 1 },
  ml: { base: 'L', factor: 0.001 },
  l: { base: 'L', factor: 1 },
  L: { base: 'L', factor: 1 },
  ea: { base: 'ea', factor: 1 }, // Added 'ea' for simplicity
};

function convertToBaseUnit(amount: number, fromUnit: string | null, toUnit: string): number {
  if (!fromUnit || fromUnit.toLowerCase() === toUnit.toLowerCase()) return amount;
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  const conversion = conversionFactors[from];
  if (conversion && conversion.base.toLowerCase() === to) return amount * conversion.factor;
  return amount;
}

async function main() {
  console.log('Start seeding (Unmanned Cafe Concept)...');

  // 1. Clean up existing data
  await prisma.productInventoryUsage.deleteMany({});
  await prisma.inventoryLog.deleteMany({});
  await prisma.supplierInventory.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.option.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.optionGroup.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create a single user for the store
  const hashedPassword = await bcrypt.hash('password', 10);
  const user = await prisma.user.create({
    data: {
      email: 'store-owner@test.com',
      password: hashedPassword,
      storeName: '24h 무인 카페',
    },
  });
  console.log(`Created user: ${user.email} with storeId: ${user.storeId}`);

  // 3. Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Coffee', storeId: user.storeId } }),
    prisma.category.create({ data: { name: 'Ade', storeId: user.storeId } }),
    prisma.category.create({ data: { name: 'Tea', storeId: user.storeId } }),
  ]);
  const [catCoffee, catAde, catTea] = categories;
  console.log(`Created ${categories.length} categories.`);

  // 4. Create Suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Bean Brothers', contact: '010-1111-2222', storeId: user.storeId } }),
    prisma.supplier.create({ data: { name: 'Fresh Dairy', contact: '010-3333-4444', storeId: user.storeId } }),
    prisma.supplier.create({ data: { name: 'Syrup World', contact: '010-5555-6666', storeId: user.storeId } }),
    prisma.supplier.create({ data: { name: 'Pack Plus', contact: '010-7777-8888', storeId: user.storeId } }),
  ]);
  const [supBean, supDairy, supSyrup, supPack] = suppliers;
  console.log(`Created ${suppliers.length} suppliers.`);

  // 5. Create Inventory Items & Link to Suppliers
  const inventoryData = [
    // Beans & Base (Bean Brothers)
    { name: '원두 (Dark Roast)', unit: 'g', quantity: 5000, packAmount: 1000, threshold: 1000, supplier: supBean, price: 20000, itemType: '원두' },
    { name: '원두 (Mild Roast)', unit: 'g', quantity: 3000, packAmount: 1000, threshold: 500, supplier: supBean, price: 22000, itemType: '원두' },

    // Dairy & Water (Fresh Dairy)
    { name: '우유', unit: 'ml', quantity: 10000, packAmount: 1000, threshold: 2000, supplier: supDairy, price: 2500, itemType: '우유' },
    { name: '탄산수', unit: 'ml', quantity: 5000, packAmount: 500, threshold: 1000, supplier: supDairy, price: 1000, itemType: '음료' },

    // Syrups & Sauces (Syrup World)
    { name: '바닐라 시럽', unit: 'ml', quantity: 2000, packAmount: 1000, threshold: 300, supplier: supSyrup, price: 12000, itemType: '시럽' },
    { name: '헤이즐넛 시럽', unit: 'ml', quantity: 1500, packAmount: 1000, threshold: 300, supplier: supSyrup, price: 12000, itemType: '시럽' },
    { name: '카라멜 시럽', unit: 'ml', quantity: 1500, packAmount: 1000, threshold: 300, supplier: supSyrup, price: 12000, itemType: '시럽' },
    { name: '초코 소스', unit: 'ml', quantity: 2000, packAmount: 1000, threshold: 300, supplier: supSyrup, price: 15000, itemType: '소스' },
    { name: '레몬 청', unit: 'ml', quantity: 3000, packAmount: 1000, threshold: 500, supplier: supSyrup, price: 18000, itemType: '청' },
    { name: '자몽 청', unit: 'ml', quantity: 3000, packAmount: 1000, threshold: 500, supplier: supSyrup, price: 18000, itemType: '청' },
    { name: '청포도 청', unit: 'ml', quantity: 3000, packAmount: 1000, threshold: 500, supplier: supSyrup, price: 18000, itemType: '청' },
    { name: '망고 퓨레', unit: 'ml', quantity: 3000, packAmount: 1000, threshold: 500, supplier: supSyrup, price: 20000, itemType: '퓨레' },
    { name: '복숭아 아이스티 분말', unit: 'g', quantity: 2000, packAmount: 1000, threshold: 500, supplier: supSyrup, price: 8000, itemType: '파우더' },
    { name: '레몬 아이스티 분말', unit: 'g', quantity: 2000, packAmount: 1000, threshold: 500, supplier: supSyrup, price: 8000, itemType: '파우더' },

    // Tea Bags (Syrup World)
    { name: '캐모마일 티백', unit: 'ea', quantity: 100, packAmount: 50, threshold: 20, supplier: supSyrup, price: 15000, itemType: '티백' },
    { name: '페퍼민트 티백', unit: 'ea', quantity: 100, packAmount: 50, threshold: 20, supplier: supSyrup, price: 15000, itemType: '티백' },
    { name: '얼그레이 티백', unit: 'ea', quantity: 100, packAmount: 50, threshold: 20, supplier: supSyrup, price: 15000, itemType: '티백' },

    // Disposables (Pack Plus)
    { name: 'HOT 컵 (12oz)', unit: 'ea', quantity: 500, packAmount: 100, threshold: 100, supplier: supPack, price: 5000, itemType: '컵' },
    { name: 'ICE 컵 (16oz)', unit: 'ea', quantity: 500, packAmount: 100, threshold: 100, supplier: supPack, price: 6000, itemType: '컵' },
    { name: 'HOT 리드', unit: 'ea', quantity: 500, packAmount: 100, threshold: 100, supplier: supPack, price: 3000, itemType: '리드' },
    { name: 'ICE 리드', unit: 'ea', quantity: 500, packAmount: 100, threshold: 100, supplier: supPack, price: 3000, itemType: '리드' },
    { name: '빨대', unit: 'ea', quantity: 1000, packAmount: 500, threshold: 200, supplier: supPack, price: 2000, itemType: '빨대' },
    { name: '컵홀더', unit: 'ea', quantity: 1000, packAmount: 500, threshold: 200, supplier: supPack, price: 4000, itemType: '홀더' },
    { name: '냅킨', unit: 'ea', quantity: 2000, packAmount: 1000, threshold: 500, supplier: supPack, price: 3000, itemType: '냅킨' },
    { name: '캐리어', unit: 'ea', quantity: 200, packAmount: 100, threshold: 50, supplier: supPack, price: 8000, itemType: '캐리어' },
  ];

  const inventories: Inventory[] = [];
  // Map to store unit cost for each inventory item
  const inventoryCostMap = new Map<number, number>();

  for (const item of inventoryData) {
    const inv = await prisma.inventory.create({
      data: {
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        packAmount: item.packAmount,
        minStockThreshold: item.threshold,
        itemType: item.itemType,
        storeId: user.storeId,
        autoOrderEnabled: true, // Enable auto-order for testing
      },
    });
    inventories.push(inv);

    // Create SupplierInventory
    await prisma.supplierInventory.create({
      data: {
        supplierId: item.supplier.id,
        inventoryId: inv.id,
        price: item.price,
        packAmount: item.packAmount,
        leadTimeDays: getRandomInt(1, 3),
      },
    });

    // Calculate unit cost (price / packAmount)
    const unitCost = item.price / item.packAmount;
    inventoryCostMap.set(inv.id, unitCost);
  }
  console.log(`Created ${inventories.length} inventory items with supplier links.`);

  const findInv = (name: string) => inventories.find(i => i.name === name);

  // 6. Create Products & Link Recipes
  const productData = [
    // Coffee (Hot/Ice)
    { name: '아메리카노 (HOT)', price: 1500, categoryId: catCoffee.id, description: '엄선된 스페셜티 원두의 깊고 진한 풍미와 은은한 산미가 조화를 이루는 프리미엄 아메리카노', recipe: [{ inv: '원두 (Dark Roast)', amt: 20 }, { inv: 'HOT 컵 (12oz)', amt: 1 }, { inv: 'HOT 리드', amt: 1 }, { inv: '컵홀더', amt: 1 }] },
    { name: '아메리카노 (ICE)', price: 1800, categoryId: catCoffee.id, description: '청량감 넘치는 시원함 속에 퍼지는 진한 에스프레소의 향기, 하루의 활력을 깨우는 아이스 아메리카노', recipe: [{ inv: '원두 (Dark Roast)', amt: 20 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }, { inv: '컵홀더', amt: 1 }] },
    { name: '카페라떼 (HOT)', price: 2500, categoryId: catCoffee.id, description: '진한 에스프레소와 부드러운 스팀 밀크가 만나 선사하는 고소하고 따뜻한 위로, 클래식 카페라떼', recipe: [{ inv: '원두 (Dark Roast)', amt: 20 }, { inv: '우유', amt: 200 }, { inv: 'HOT 컵 (12oz)', amt: 1 }, { inv: 'HOT 리드', amt: 1 }, { inv: '컵홀더', amt: 1 }] },
    { name: '카페라떼 (ICE)', price: 2800, categoryId: catCoffee.id, description: '신선한 우유의 고소함과 에스프레소의 깊은 맛이 얼음과 함께 어우러진 시원하고 부드러운 라떼', recipe: [{ inv: '원두 (Dark Roast)', amt: 20 }, { inv: '우유', amt: 200 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }, { inv: '컵홀더', amt: 1 }] },
    { name: '바닐라라떼 (HOT)', price: 3000, categoryId: catCoffee.id, description: '천연 바닐라 빈의 달콤하고 향긋한 풍미가 더해져 기분 좋은 달콤함을 선사하는 바닐라 라떼', recipe: [{ inv: '원두 (Mild Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '바닐라 시럽', amt: 30 }, { inv: 'HOT 컵 (12oz)', amt: 1 }, { inv: 'HOT 리드', amt: 1 }] },
    { name: '바닐라라떼 (ICE)', price: 3300, categoryId: catCoffee.id, description: '달콤한 바닐라 향이 시원한 우유와 만나 입안 가득 행복을 전하는 아이스 바닐라 라떼', recipe: [{ inv: '원두 (Mild Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '바닐라 시럽', amt: 30 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '헤이즐넛라떼 (HOT)', price: 3000, categoryId: catCoffee.id, description: '고소한 헤이즐넛의 풍부한 향이 커피의 깊이를 더해주는 매력적인 헤이즐넛 라떼', recipe: [{ inv: '원두 (Mild Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '헤이즐넛 시럽', amt: 30 }, { inv: 'HOT 컵 (12oz)', amt: 1 }, { inv: 'HOT 리드', amt: 1 }] },
    { name: '헤이즐넛라떼 (ICE)', price: 3300, categoryId: catCoffee.id, description: '시원한 라떼 속에 숨겨진 향긋한 헤이즐넛의 여운, 특별한 휴식을 위한 한 잔', recipe: [{ inv: '원두 (Mild Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '헤이즐넛 시럽', amt: 30 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '카라멜마키아또 (HOT)', price: 3500, categoryId: catCoffee.id, description: '진한 카라멜 소스의 달콤함과 부드러운 거품이 어우러진 달콤한 유혹, 카라멜 마키아또', recipe: [{ inv: '원두 (Mild Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '카라멜 시럽', amt: 30 }, { inv: 'HOT 컵 (12oz)', amt: 1 }, { inv: 'HOT 리드', amt: 1 }] },
    { name: '카라멜마키아또 (ICE)', price: 3800, categoryId: catCoffee.id, description: '시원하게 즐기는 달콤한 카라멜의 풍미, 당 충전이 필요한 순간 완벽한 선택', recipe: [{ inv: '원두 (Mild Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '카라멜 시럽', amt: 30 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '카페모카 (HOT)', price: 3500, categoryId: catCoffee.id, description: '진한 다크 초콜릿의 쌉싸름한 달콤함이 에스프레소와 만나 완성된 깊고 진한 카페모카', recipe: [{ inv: '원두 (Dark Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '초코 소스', amt: 30 }, { inv: 'HOT 컵 (12oz)', amt: 1 }, { inv: 'HOT 리드', amt: 1 }] },
    { name: '카페모카 (ICE)', price: 3800, categoryId: catCoffee.id, description: '시원한 초콜릿 우유를 마시는 듯한 즐거움, 커피와 초콜릿의 환상적인 조화', recipe: [{ inv: '원두 (Dark Roast)', amt: 20 }, { inv: '우유', amt: 180 }, { inv: '초코 소스', amt: 30 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },

    // Ade
    { name: '레몬 에이드', price: 3500, categoryId: catAde.id, description: '상큼한 레몬을 통째로 갈아 넣은 듯한 짜릿한 상큼함, 비타민 C 가득한 활력 충전 레몬 에이드', recipe: [{ inv: '탄산수', amt: 200 }, { inv: '레몬 청', amt: 50 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '자몽 에이드', price: 3800, categoryId: catAde.id, description: '쌉싸름하면서도 달콤한 자몽의 매력을 그대로 담은, 붉은 빛깔이 매혹적인 리얼 자몽 에이드', recipe: [{ inv: '탄산수', amt: 200 }, { inv: '자몽 청', amt: 50 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '청포도 에이드', price: 3800, categoryId: catAde.id, description: '싱그러운 청포도의 달콤함과 톡 쏘는 탄산의 만남, 기분까지 상쾌해지는 청포도 에이드', recipe: [{ inv: '탄산수', amt: 200 }, { inv: '청포도 청', amt: 50 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '망고 에이드', price: 4000, categoryId: catAde.id, description: '열대 과일의 여왕 망고의 진한 달콤함을 가득 담은, 이국적인 휴양지의 맛 망고 에이드', recipe: [{ inv: '탄산수', amt: 200 }, { inv: '망고 퓨레', amt: 50 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },

    // Tea
    { name: '복숭아 아이스티', price: 2500, categoryId: catTea.id, description: '달콤한 복숭아 향과 홍차의 깔끔함이 어우러진, 남녀노소 누구나 사랑하는 국민 음료', recipe: [{ inv: '복숭아 아이스티 분말', amt: 40 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '레몬 아이스티', price: 2500, categoryId: catTea.id, description: '상큼한 레몬과 시원한 홍차의 조화, 갈증 해소에 탁월한 깔끔한 맛의 레몬 아이스티', recipe: [{ inv: '레몬 아이스티 분말', amt: 40 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }] },
    { name: '캐모마일 티 (HOT)', price: 2500, categoryId: catTea.id, description: '은은한 사과향이 마음을 편안하게 해주는 허브티, 지친 하루의 끝에 따뜻한 위로가 되는 캐모마일', recipe: [{ inv: '캐모마일 티백', amt: 1 }, { inv: 'HOT 컵 (12oz)', amt: 1 }, { inv: 'HOT 리드', amt: 1 }, { inv: '컵홀더', amt: 1 }] },
    { name: '페퍼민트 티 (ICE)', price: 2500, categoryId: catTea.id, description: '입안 가득 퍼지는 상쾌한 박하향이 머리까지 맑게 해주는 청량한 허브티, 페퍼민트', recipe: [{ inv: '페퍼민트 티백', amt: 1 }, { inv: 'ICE 컵 (16oz)', amt: 1 }, { inv: 'ICE 리드', amt: 1 }, { inv: '빨대', amt: 1 }, { inv: '컵홀더', amt: 1 }] },
  ];

  const products: Product[] = [];
  // Map to store product cost
  const productCostMap = new Map<number, number>();

  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        price: p.price,
        stock: 100,
        categoryId: p.categoryId,
        storeId: user.storeId,
        imageUrl: '',
        description: p.description, // Add description
      },
    });
    products.push(product);

    let productCost = 0;

    // Create Recipe & Calculate Cost
    for (const ing of p.recipe) {
      const invItem = findInv(ing.inv);
      if (invItem) {
        await prisma.productInventoryUsage.create({
          data: {
            productId: product.id,
            inventoryId: invItem.id,
            usageAmount: ing.amt,
            usageUnit: invItem.unit,
          },
        });

        // Calculate cost for this ingredient
        const unitCost = inventoryCostMap.get(invItem.id) || 0;
        // Assuming usageUnit matches inventory unit for simplicity in seed
        // If conversion needed, use helper
        const usageAmountBase = convertToBaseUnit(ing.amt, invItem.unit, invItem.unit);
        productCost += usageAmountBase * unitCost;
      }
    }
    productCostMap.set(product.id, productCost);
  }
  console.log(`Created ${products.length} products with recipes and calculated costs.`);

  // 7. Generate orders for the past 90 days
  console.log('Generating orders for the past 90 days...');
  const today = new Date();

  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const ordersPerDay = getRandomInt(10, 30);
    const dailyOrderPromises = [];

    for (let j = 0; j < ordersPerDay; j++) {
      const itemsInOrder = getRandomInt(1, 3);
      const orderItemsData = [];
      let totalAmount = 0;
      let totalCost = 0;

      for (let k = 0; k < itemsInOrder; k++) {
        const product = getRandomItem(products);
        const quantity = getRandomInt(1, 2);
        const pricePerItem = product.price;
        const costPerItem = productCostMap.get(product.id) || 0;

        totalAmount += pricePerItem * quantity;
        totalCost += costPerItem * quantity;

        orderItemsData.push({
          productId: product.id,
          quantity: quantity,
          pricePerItem: pricePerItem,
          costPerItem: costPerItem, // Save cost per item
        });
      }

      const orderTime = new Date(date);
      orderTime.setHours(getRandomInt(8, 23), getRandomInt(0, 59));

      dailyOrderPromises.push(
        prisma.order.create({
          data: {
            storeId: user.storeId,
            totalAmount: totalAmount,
            totalCost: totalCost, // Save total cost
            createdAt: orderTime,
            orderItems: {
              create: orderItemsData,
            },
            status: 'COMPLETED',
          },
        })
      );
    }

    await Promise.all(dailyOrderPromises);

    process.stdout.write(`.`);
    if ((i + 1) % 10 === 0) {
      console.log(` ${i + 1}/90 days completed`);
    }
  }
  console.log('\nFinished generating orders.');
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

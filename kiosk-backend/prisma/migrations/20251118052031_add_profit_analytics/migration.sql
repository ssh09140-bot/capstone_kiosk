-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "totalCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "costPerItem" DOUBLE PRECISION;

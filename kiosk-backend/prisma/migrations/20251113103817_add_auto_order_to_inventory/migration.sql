-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "autoOrderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estimatedDeliveryDays" INTEGER,
ADD COLUMN     "minStockThreshold" DOUBLE PRECISION,
ADD COLUMN     "orderQuantity" DOUBLE PRECISION;

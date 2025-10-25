/*
  Warnings:

  - The values [PENDING,APPROVED,REJECTED,COMPLETED] on the enum `PurchaseOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `totalAmount` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerItem` on the `PurchaseOrderItem` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('LOW_STOCK_WARNING', 'ORDER_CONFIRMATION', 'DELIVERY_PROMPT', 'DELIVERY_REMINDER');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."PurchaseOrderStatus_new" AS ENUM ('PENDING_CONFIRMATION', 'ORDERED', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."PurchaseOrder" ALTER COLUMN "status" TYPE "public"."PurchaseOrderStatus_new" USING ("status"::text::"public"."PurchaseOrderStatus_new");
ALTER TYPE "public"."PurchaseOrderStatus" RENAME TO "PurchaseOrderStatus_old";
ALTER TYPE "public"."PurchaseOrderStatus_new" RENAME TO "PurchaseOrderStatus";
DROP TYPE "public"."PurchaseOrderStatus_old";
ALTER TABLE "public"."PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'PENDING_CONFIRMATION';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "autoOrderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estimatedDeliveryDays" INTEGER,
ADD COLUMN     "eventPrice" INTEGER,
ADD COLUMN     "isEventProduct" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minStockThreshold" INTEGER,
ADD COLUMN     "orderQuantity" INTEGER;

-- AlterTable
ALTER TABLE "public"."PurchaseOrder" DROP COLUMN "totalAmount",
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "estimatedDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "orderedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING_CONFIRMATION';

-- AlterTable
ALTER TABLE "public"."PurchaseOrderItem" DROP COLUMN "pricePerItem",
ADD COLUMN     "defectiveQuantity" INTEGER;

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "public"."NotificationType" NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."User"("storeId") ON DELETE RESTRICT ON UPDATE CASCADE;

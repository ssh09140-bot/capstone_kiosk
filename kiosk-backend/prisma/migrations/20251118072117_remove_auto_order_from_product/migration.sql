/*
  Warnings:

  - You are about to drop the column `autoOrderEnabled` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDeliveryDays` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minStockThreshold` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `orderQuantity` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "autoOrderEnabled",
DROP COLUMN "estimatedDeliveryDays",
DROP COLUMN "minStockThreshold",
DROP COLUMN "orderQuantity";

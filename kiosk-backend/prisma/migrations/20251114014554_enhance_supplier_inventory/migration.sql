/*
  Warnings:

  - You are about to drop the column `supplierId` on the `Inventory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_supplierId_fkey";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "supplierId";

-- CreateTable
CREATE TABLE "SupplierInventory" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "leadTimeDays" INTEGER,

    CONSTRAINT "SupplierInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInventory_supplierId_inventoryId_key" ON "SupplierInventory"("supplierId", "inventoryId");

-- AddForeignKey
ALTER TABLE "SupplierInventory" ADD CONSTRAINT "SupplierInventory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInventory" ADD CONSTRAINT "SupplierInventory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

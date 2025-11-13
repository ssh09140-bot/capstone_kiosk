/*
  Warnings:

  - The primary key for the `_OptionGroupToProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[businessRegistrationNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_OptionGroupToProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessLicenseImageUrl" TEXT,
ADD COLUMN     "businessRegistrationNumber" TEXT;

-- AlterTable
ALTER TABLE "_OptionGroupToProduct" DROP CONSTRAINT "_OptionGroupToProduct_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "User_businessRegistrationNumber_key" ON "User"("businessRegistrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "_OptionGroupToProduct_AB_unique" ON "_OptionGroupToProduct"("A", "B");

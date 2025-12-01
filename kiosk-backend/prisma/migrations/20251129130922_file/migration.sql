-- DropForeignKey
ALTER TABLE "Option" DROP CONSTRAINT "Option_optionGroupId_fkey";

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

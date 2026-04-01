/*
  Warnings:

  - You are about to drop the column `accountName` on the `Account` table. All the data in the column will be lost.
  - Added the required column `accountCode` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "accountName",
ADD COLUMN     "accountCode" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_accountCode_fkey" FOREIGN KEY ("accountCode") REFERENCES "BrokerageCompany"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

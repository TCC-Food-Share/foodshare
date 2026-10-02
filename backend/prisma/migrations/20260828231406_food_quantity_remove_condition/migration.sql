/*
  Warnings:

  - You are about to drop the column `condition` on the `food` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `food` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "food" DROP COLUMN "condition",
ADD COLUMN     "quantity" DECIMAL(10,2) NOT NULL;

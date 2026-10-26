/*
  Warnings:

  - You are about to drop the column `categoryId` on the `food` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `food` table. All the data in the column will be lost.
  - You are about to drop the column `quantityUnit` on the `food` table. All the data in the column will be lost.
  - Added the required column `catalogItemId` to the `food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `measurementUnitId` to the `food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestType` to the `food` table without a default value. This is not possible if the table is not empty.
  - Made the column `image` on table `food` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "FoodRequestType" AS ENUM ('TOTAL_ONLY', 'PARTIAL_ONLY', 'TOTAL_OR_PARTIAL');

-- DropForeignKey
ALTER TABLE "food" DROP CONSTRAINT "food_categoryId_fkey";

-- AlterTable
ALTER TABLE "food" DROP COLUMN "categoryId",
DROP COLUMN "name",
DROP COLUMN "quantityUnit",
ADD COLUMN     "catalogItemId" INTEGER NOT NULL,
ADD COLUMN     "measurementUnitId" INTEGER NOT NULL,
ADD COLUMN     "notes" VARCHAR(2000),
ADD COLUMN     "requestType" "FoodRequestType" NOT NULL,
ALTER COLUMN "image" SET NOT NULL;

-- CreateIndex
CREATE INDEX "food_statusId_deleted_idx" ON "food"("statusId", "deleted");

-- CreateIndex
CREATE INDEX "food_establishmentId_statusId_idx" ON "food"("establishmentId", "statusId");

-- AddForeignKey
ALTER TABLE "food" ADD CONSTRAINT "food_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "food_catalog_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food" ADD CONSTRAINT "food_measurementUnitId_fkey" FOREIGN KEY ("measurementUnitId") REFERENCES "measurement_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

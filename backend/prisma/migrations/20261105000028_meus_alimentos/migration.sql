-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('TOTAL', 'PARTIAL');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "quantityUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "type" "OrderType";

-- Backfill: only a pending order can still match the whole stock
UPDATE "order" o
SET "type" = CASE
  WHEN s."name" = 'Pendente' AND o."quantity" = f."quantity" AND f."requestType" <> 'PARTIAL_ONLY'
    THEN 'TOTAL'::"OrderType"
  ELSE 'PARTIAL'::"OrderType"
END
FROM "order_status" s, "food" f
WHERE s."id" = o."statusId" AND f."id" = o."foodId";

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "type" SET NOT NULL;

-- CreateIndex
CREATE INDEX "order_foodId_statusId_idx" ON "order"("foodId", "statusId");

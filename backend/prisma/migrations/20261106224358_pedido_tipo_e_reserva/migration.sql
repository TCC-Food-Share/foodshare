-- AlterTable
ALTER TABLE "order" ADD COLUMN     "acceptedAt" TIMESTAMP(3);

-- Backfill: nothing changes an in-progress order after the accept, so updatedAt is the accept time
UPDATE "order" o
SET "acceptedAt" = o."updatedAt"
FROM "order_status" s
WHERE s."id" = o."statusId" AND s."name" = 'Em andamento';

-- CreateIndex
CREATE INDEX "order_beneficiaryEntityId_statusId_idx" ON "order"("beneficiaryEntityId", "statusId");

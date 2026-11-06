-- CreateEnum
CREATE TYPE "OrderCancelledBy" AS ENUM ('ESTABLISHMENT', 'BENEFICIARY_ENTITY', 'ADMINISTRATOR', 'SYSTEM');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "cancelledBy" "OrderCancelledBy";

-- Backfill: until this change only food deletion (RF16) cancelled orders, always by the establishment.
UPDATE "order"
SET "cancelledBy" = 'ESTABLISHMENT'
WHERE "statusId" = (SELECT id FROM "order_status" WHERE name = 'Cancelado');

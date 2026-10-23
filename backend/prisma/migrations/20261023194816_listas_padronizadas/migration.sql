-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('CATEGORY', 'FOOD_CATALOG_ITEM', 'MEASUREMENT_UNIT', 'CANCELLATION_REASON');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "cancellation_reason" DROP CONSTRAINT "cancellation_reason_administratorId_fkey";

-- AlterTable
ALTER TABLE "cancellation_reason" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "administratorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "category" ADD COLUMN     "administratorId" INTEGER;

-- CreateTable
CREATE TABLE "food_catalog_item" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "administratorId" INTEGER,

    CONSTRAINT "food_catalog_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_unit" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "abbreviation" VARCHAR(10) NOT NULL,
    "allowsFraction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "administratorId" INTEGER,

    CONSTRAINT "measurement_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prohibited_term" (
    "id" SERIAL NOT NULL,
    "term" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "administratorId" INTEGER,

    CONSTRAINT "prohibited_term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestion" (
    "id" SERIAL NOT NULL,
    "type" "SuggestionType" NOT NULL,
    "text" VARCHAR(200) NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "reviewerId" INTEGER,

    CONSTRAINT "suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_catalog_item_name_key" ON "food_catalog_item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_unit_name_key" ON "measurement_unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_unit_abbreviation_key" ON "measurement_unit"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "prohibited_term_term_key" ON "prohibited_term"("term");

-- CreateIndex
CREATE INDEX "suggestion_status_type_idx" ON "suggestion"("status", "type");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_reason" ADD CONSTRAINT "cancellation_reason_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_catalog_item" ADD CONSTRAINT "food_catalog_item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_catalog_item" ADD CONSTRAINT "food_catalog_item_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_unit" ADD CONSTRAINT "measurement_unit_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prohibited_term" ADD CONSTRAINT "prohibited_term_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateFunction
CREATE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- CreateIndex
CREATE UNIQUE INDEX "category_name_normalized_key" ON "category" (lower(immutable_unaccent("name")));

-- CreateIndex
CREATE UNIQUE INDEX "food_catalog_item_name_normalized_key" ON "food_catalog_item" (lower(immutable_unaccent("name")));

-- CreateIndex
CREATE UNIQUE INDEX "measurement_unit_name_normalized_key" ON "measurement_unit" (lower(immutable_unaccent("name")));

-- CreateIndex
CREATE UNIQUE INDEX "measurement_unit_abbreviation_normalized_key" ON "measurement_unit" (lower(immutable_unaccent("abbreviation")));

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_reason_name_normalized_key" ON "cancellation_reason" (lower(immutable_unaccent("name")));

-- CreateIndex
CREATE UNIQUE INDEX "prohibited_term_term_normalized_key" ON "prohibited_term" (lower(immutable_unaccent("term")));

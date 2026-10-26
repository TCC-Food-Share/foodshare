UPDATE "food_catalog_item"
SET "categoryId" = (SELECT "id" FROM "category" WHERE "name" = 'Perecíveis')
WHERE "name" = 'Refeição pronta';

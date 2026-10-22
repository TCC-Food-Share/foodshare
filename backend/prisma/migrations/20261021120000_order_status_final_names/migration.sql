-- Brings databases created before `status-pedido-final` to the final status
-- names without dropping data. Idempotent: on databases already seeded with
-- the new names it only removes leftovers and inserts nothing.

-- Aceito -> Em andamento
UPDATE "order_status"
SET "name" = 'Em andamento', "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Aceito'
  AND NOT EXISTS (SELECT 1 FROM "order_status" WHERE "name" = 'Em andamento');

UPDATE "order"
SET "statusId" = (SELECT "id" FROM "order_status" WHERE "name" = 'Em andamento')
WHERE "statusId" = (SELECT "id" FROM "order_status" WHERE "name" = 'Aceito');

DELETE FROM "order_status" WHERE "name" = 'Aceito';

-- Recebido -> Doado
UPDATE "order_status"
SET "name" = 'Doado', "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Recebido'
  AND NOT EXISTS (SELECT 1 FROM "order_status" WHERE "name" = 'Doado');

UPDATE "order"
SET "statusId" = (SELECT "id" FROM "order_status" WHERE "name" = 'Doado')
WHERE "statusId" = (SELECT "id" FROM "order_status" WHERE "name" = 'Recebido');

DELETE FROM "order_status" WHERE "name" = 'Recebido';

-- Statuses that did not exist in the MVP
INSERT INTO "order_status" ("name", "updatedAt") VALUES
  ('Pendente', CURRENT_TIMESTAMP),
  ('Em andamento', CURRENT_TIMESTAMP),
  ('Rejeitado', CURRENT_TIMESTAMP),
  ('Doado', CURRENT_TIMESTAMP),
  ('Cancelado', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "food_status" ("name", "updatedAt") VALUES
  ('Ativo', CURRENT_TIMESTAMP),
  ('Reservado', CURRENT_TIMESTAMP),
  ('Inativo', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

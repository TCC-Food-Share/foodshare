-- O better-auth roda com generateId: 'serial' e converte todo id para número.
-- Com o id em UUID, o consumo do código (verify-email, reset-password) falhava.
-- Os códigos pendentes são descartáveis (valem 10 minutos).
DELETE FROM "verification";

-- AlterTable
ALTER TABLE "verification" DROP CONSTRAINT "verification_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "verification_pkey" PRIMARY KEY ("id");

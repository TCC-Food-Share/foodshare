import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  'Perecíveis',
  'Não Perecíveis',
  'Hortifruti',
  'Laticínios',
  'Carnes',
  'Pães e Massas',
  'Bebidas',
  'Outros',
];

const FOOD_STATUSES = ['Ativo'];

const ORDER_STATUSES = ['Pendente'];

async function main() {
  await prisma.role.upsert({
    where: { name: 'Establishment' },
    update: {},
    create: { name: 'Establishment' },
  });

  await prisma.role.upsert({
    where: { name: 'BeneficiaryEntity' },
    update: {},
    create: { name: 'BeneficiaryEntity' },
  });

  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of FOOD_STATUSES) {
    await prisma.foodStatus.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of ORDER_STATUSES) {
    await prisma.orderStatus.upsert({ where: { name }, update: {}, create: { name } });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

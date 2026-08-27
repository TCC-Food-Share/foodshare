import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

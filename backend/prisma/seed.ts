import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { auth } from '../src/auth/auth.instance';
import { ROLE, ROLE_NAMES } from '../src/auth/roles.constants';
import { SYSTEM_CANCELLATION_REASON_NAMES } from '../src/catalog/cancellation-reasons.constants';
import { normalizeText } from '../src/common/normalize-text';
import { FOOD_STATUS_NAMES } from '../src/foods/foods.constants';
import { ORDER_STATUS_NAMES } from '../src/orders/orders.constants';
import { COMMON_CANCELLATION_REASONS } from './seed-data/cancellation-reasons';
import { FOOD_CATALOG } from './seed-data/food-catalog';
import { MEASUREMENT_UNITS } from './seed-data/measurement-units';
import { PROHIBITED_TERMS } from './seed-data/prohibited-terms';

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

async function main() {
  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of FOOD_STATUS_NAMES) {
    await prisma.foodStatus.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of ORDER_STATUS_NAMES) {
    await prisma.orderStatus.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const unit of MEASUREMENT_UNITS) {
    await prisma.measurementUnit.upsert({ where: { name: unit.name }, update: {}, create: unit });
  }

  for (const name of SYSTEM_CANCELLATION_REASON_NAMES) {
    await prisma.cancellationReason.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: true },
    });
  }

  for (const name of COMMON_CANCELLATION_REASONS) {
    await prisma.cancellationReason.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const term of PROHIBITED_TERMS.map(normalizeText)) {
    await prisma.prohibitedTerm.upsert({ where: { term }, update: {}, create: { term } });
  }

  await seedFoodCatalog();

  await seedFirstAdministrator();
}

async function seedFoodCatalog() {
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));

  for (const item of FOOD_CATALOG) {
    const categoryId = categoryIdByName.get(item.category);
    if (categoryId === undefined) {
      throw new Error(`Food catalog item "${item.name}" uses unknown category "${item.category}".`);
    }
    await prisma.foodCatalogItem.upsert({
      where: { name: item.name },
      update: {},
      create: { name: item.name, categoryId },
    });
  }
}

async function seedFirstAdministrator() {
  const name = process.env.SEED_ADMIN_NAME?.trim();
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.warn(
      'SEED_ADMIN_NAME, SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set: skipping first administrator.',
    );
    return;
  }

  const administratorCount = await prisma.user.count({
    where: { role: { name: ROLE.ADMINISTRATOR } },
  });
  if (administratorCount > 0) return;

  const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE.ADMINISTRATOR } });

  try {
    await auth.api.signUpEmail({ body: { name, email, password, roleId: role.id } });
  } catch (error) {
    throw new Error(
      `Could not create the first administrator (${email}). Is this email already in use?`,
      { cause: error },
    );
  }
  console.warn(`First administrator created: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

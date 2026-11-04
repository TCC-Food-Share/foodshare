import { Prisma } from '../../../../generated/prisma/client';

type Client = Pick<Prisma.TransactionClient, '$queryRaw'>;

export const NORMALIZED_COLUMNS = {
  category: ['name'],
  food_catalog_item: ['name'],
  measurement_unit: ['name', 'abbreviation'],
  cancellation_reason: ['name'],
  prohibited_term: ['term'],
} as const;

type Table = keyof typeof NORMALIZED_COLUMNS;
type Column<T extends Table> = (typeof NORMALIZED_COLUMNS)[T][number];

export async function hasDuplicate<T extends Table>(
  client: Client,
  table: T,
  column: Column<T>,
  value: string,
  excludeId?: number,
): Promise<boolean> {
  const rows = await client.$queryRaw<{ id: number }[]>`
    SELECT id FROM ${Prisma.raw(`"${table}"`)}
    WHERE lower(immutable_unaccent(${Prisma.raw(`"${column}"`)})) = lower(immutable_unaccent(${value}))
      AND id <> ${excludeId ?? 0}
    LIMIT 1
  `;
  return rows.length > 0;
}

import { Prisma } from '../../generated/prisma/client';

// Lock order shared by every flow that touches an institution's orders or foods:
// institution row -> foods (ascending id) -> orders. Account deletion takes FOR UPDATE on the
// institution; the creation flows below take FOR SHARE, so they wait for a deletion in flight and
// then see it, without blocking each other.

export async function lockLiveEstablishmentForShare(
  tx: Prisma.TransactionClient,
  establishmentId: number,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM establishment WHERE id = ${establishmentId} AND deleted = false FOR SHARE`;
  return rows.length > 0;
}

export async function lockLiveBeneficiaryEntityForShare(
  tx: Prisma.TransactionClient,
  beneficiaryEntityId: number,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM beneficiary_entity
    WHERE id = ${beneficiaryEntityId} AND deleted = false FOR SHARE`;
  return rows.length > 0;
}

export async function lockEstablishmentForUpdate(
  tx: Prisma.TransactionClient,
  establishmentId: number,
): Promise<{ deleted: boolean } | null> {
  const rows = await tx.$queryRaw<{ deleted: boolean }[]>`
    SELECT deleted FROM establishment WHERE id = ${establishmentId} FOR UPDATE`;
  return rows[0] ?? null;
}

export async function lockBeneficiaryEntityForUpdate(
  tx: Prisma.TransactionClient,
  beneficiaryEntityId: number,
): Promise<{ deleted: boolean } | null> {
  const rows = await tx.$queryRaw<{ deleted: boolean }[]>`
    SELECT deleted FROM beneficiary_entity WHERE id = ${beneficiaryEntityId} FOR UPDATE`;
  return rows[0] ?? null;
}

// ORDER BY before FOR UPDATE: rows are locked in id order, so two multi-food locks never deadlock.
export async function lockFoodsOfEstablishment(
  tx: Prisma.TransactionClient,
  establishmentId: number,
): Promise<void> {
  await tx.$queryRaw`
    SELECT id FROM food
    WHERE "establishmentId" = ${establishmentId} AND deleted = false
    ORDER BY id FOR UPDATE`;
}

export async function lockFoods(tx: Prisma.TransactionClient, foodIds: number[]): Promise<void> {
  if (foodIds.length === 0) return;
  await tx.$queryRaw`
    SELECT id FROM food WHERE id IN (${Prisma.join(foodIds)}) ORDER BY id FOR UPDATE`;
}

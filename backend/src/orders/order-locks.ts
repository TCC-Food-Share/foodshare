import { Prisma } from '../../generated/prisma/client';

/**
 * Locks the orders in id order before a batch delete. Every permanent deletion that removes
 * orders in batch (institution, food, order) goes through here, and the same order keeps them
 * from deadlocking each other.
 */
export async function lockOrders(
  tx: Prisma.TransactionClient,
  where: Prisma.OrderWhereInput,
): Promise<void> {
  const ids = await tx.order.findMany({ where, select: { id: true } });
  if (ids.length === 0) return;
  await tx.$queryRaw`
    SELECT id FROM "order"
    WHERE id IN (${Prisma.join(ids.map((order) => order.id))})
    ORDER BY id FOR UPDATE`;
}

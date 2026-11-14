import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { OrderCancelledBy, Prisma } from '../../generated/prisma/client';
import type { BetterAuthInstance } from '../auth/better-auth.token';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { SYSTEM_CANCELLATION_REASON } from '../catalog/cancellation-reasons.constants';
import { orderStatusId, returnReservedQuantity } from '../foods/food-order-effects';
import { ORDER_STATUS } from '../orders/orders.constants';
import { PrismaService } from '../prisma/prisma.service';
import { INVALID_PASSWORD } from './account-deletion.constants';
import {
  lockBeneficiaryEntityForUpdate,
  lockEstablishmentForUpdate,
  lockFoods,
  lockFoodsOfEstablishment,
} from './institution-locks';

export interface DeletionImpact {
  pendingOrders: number;
  inProgressOrders: number;
}

// Who cancels and why. Self-deletion uses the system reason and the party itself (RN30, DT44);
// the admin panel (5.3) passes the reason it picked and ADMINISTRATOR.
export interface ClosureCancellation {
  cancellationReasonId: number;
  cancelledBy: OrderCancelledBy;
}

@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
  ) {}

  async establishmentImpact(userId: number): Promise<DeletionImpact> {
    const { id } = await this.requireEstablishment(userId);
    return this.impact({ establishmentId: id });
  }

  async beneficiaryEntityImpact(userId: number): Promise<DeletionImpact> {
    const { id } = await this.requireBeneficiaryEntity(userId);
    return this.impact({ beneficiaryEntityId: id });
  }

  async deleteOwnEstablishment(userId: number, password: string): Promise<void> {
    const { id } = await this.requireEstablishment(userId);
    await this.verifyPassword(userId, password);

    await this.prisma.$transaction(async (tx) => {
      const cancellationReasonId = await this.accountClosedReasonId(tx);
      const closed = await this.closeEstablishment(tx, id, {
        cancellationReasonId,
        cancelledBy: OrderCancelledBy.ESTABLISHMENT,
      });
      if (closed) await this.closeUser(tx, userId);
    });
  }

  async deleteOwnBeneficiaryEntity(userId: number, password: string): Promise<void> {
    const { id } = await this.requireBeneficiaryEntity(userId);
    await this.verifyPassword(userId, password);

    await this.prisma.$transaction(async (tx) => {
      const cancellationReasonId = await this.accountClosedReasonId(tx);
      const closed = await this.closeBeneficiaryEntity(tx, id, {
        cancellationReasonId,
        cancelledBy: OrderCancelledBy.BENEFICIARY_ENTITY,
      });
      if (closed) await this.closeUser(tx, userId);
    });
  }

  /**
   * RN28. Returns false, changing nothing, when the establishment was already deleted (a second
   * deletion that waited on the lock). Orders are not marked deleted: entities keep their history.
   */
  async closeEstablishment(
    tx: Prisma.TransactionClient,
    establishmentId: number,
    cancellation: ClosureCancellation,
  ): Promise<boolean> {
    const establishment = await lockEstablishmentForUpdate(tx, establishmentId);
    if (!establishment || establishment.deleted) return false;

    // With every food locked, no accept, cancel, receive, food edit or new order runs midway.
    await lockFoodsOfEstablishment(tx, establishmentId);

    const [pendingId, inProgressId, rejectedId, cancelledId] = await Promise.all([
      orderStatusId(tx, ORDER_STATUS.PENDING),
      orderStatusId(tx, ORDER_STATUS.IN_PROGRESS),
      orderStatusId(tx, ORDER_STATUS.REJECTED),
      orderStatusId(tx, ORDER_STATUS.CANCELLED),
    ]);

    await tx.order.updateMany({
      where: { establishmentId, statusId: pendingId, deleted: false },
      data: { statusId: rejectedId },
    });
    // No stock back: the food is deleted right below (DT27).
    await tx.order.updateMany({
      where: { establishmentId, statusId: inProgressId, deleted: false },
      data: { statusId: cancelledId, ...cancellation },
    });
    await tx.food.updateMany({
      where: { establishmentId, deleted: false },
      data: { deleted: true },
    });
    await tx.establishment.update({ where: { id: establishmentId }, data: { deleted: true } });
    return true;
  }

  /**
   * RN29. Returns false, changing nothing, when the entity was already deleted. Orders "Doado" and
   * "Cancelado" with an establishment that is not deleted stay visible, including the ones this
   * closure has just cancelled.
   */
  async closeBeneficiaryEntity(
    tx: Prisma.TransactionClient,
    beneficiaryEntityId: number,
    cancellation: ClosureCancellation,
  ): Promise<boolean> {
    const entity = await lockBeneficiaryEntityForUpdate(tx, beneficiaryEntityId);
    if (!entity || entity.deleted) return false;

    const [pendingId, inProgressId, donatedId, cancelledId] = await Promise.all([
      orderStatusId(tx, ORDER_STATUS.PENDING),
      orderStatusId(tx, ORDER_STATUS.IN_PROGRESS),
      orderStatusId(tx, ORDER_STATUS.DONATED),
      orderStatusId(tx, ORDER_STATUS.CANCELLED),
    ]);
    const openWhere: Prisma.OrderWhereInput = {
      beneficiaryEntityId,
      deleted: false,
      statusId: { in: [pendingId, inProgressId] },
    };

    // Order creation holds the entity lock (FOR SHARE), so no new open order shows up after this
    // read. Accept/cancel may still move these orders until their foods are locked: read again.
    const foods = await tx.order.findMany({
      where: openWhere,
      select: { foodId: true },
      distinct: ['foodId'],
    });
    await lockFoods(
      tx,
      foods.map((food) => food.foodId).sort((a, b) => a - b),
    );
    const open = await tx.order.findMany({
      where: openWhere,
      select: { id: true, statusId: true, foodId: true, quantity: true },
      orderBy: { id: 'asc' },
    });

    await tx.order.updateMany({
      where: { beneficiaryEntityId, statusId: pendingId, deleted: false },
      data: { statusId: cancelledId, ...cancellation },
    });
    // One by one, so DT32 recomputes the total pending orders after each give-back.
    for (const order of open.filter((o) => o.statusId === inProgressId)) {
      const moved = await tx.order.updateMany({
        where: { id: order.id, statusId: inProgressId, deleted: false },
        data: { statusId: cancelledId, ...cancellation },
      });
      if (moved.count > 0) {
        await returnReservedQuantity(tx, order.foodId, order.quantity);
      }
    }

    await tx.order.updateMany({
      where: {
        beneficiaryEntityId,
        deleted: false,
        NOT: { statusId: { in: [donatedId, cancelledId] }, establishment: { deleted: false } },
      },
      data: { deleted: true },
    });
    await tx.beneficiaryEntity.update({
      where: { id: beneficiaryEntityId },
      data: { deleted: true },
    });
    return true;
  }

  // Runs before the transaction: hashing is slow and must not hold row locks.
  private async verifyPassword(userId: number, password: string): Promise<void> {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: 'credential' },
      select: { password: true },
    });
    const context = await this.auth.$context;
    const valid = account?.password
      ? await context.password.verify({ hash: account.password, password })
      : false;
    if (!valid) {
      // 400, not 401: a 401 logs the frontend out, and a wrong password keeps the session (DT45).
      throw new BadRequestException({ code: INVALID_PASSWORD, message: 'Invalid password.' });
    }
  }

  private async closeUser(tx: Prisma.TransactionClient, userId: number): Promise<void> {
    await tx.user.update({ where: { id: userId }, data: { deleted: true } });
    // Sessions live only in the table (no cookie cache): deleting them logs out every device.
    await tx.session.deleteMany({ where: { userId } });
  }

  private async accountClosedReasonId(tx: Prisma.TransactionClient): Promise<number> {
    const reason = await tx.cancellationReason.findUniqueOrThrow({
      where: { name: SYSTEM_CANCELLATION_REASON.ACCOUNT_CLOSED, isSystem: true },
    });
    return reason.id;
  }

  private async impact(
    owner: { establishmentId: number } | { beneficiaryEntityId: number },
  ): Promise<DeletionImpact> {
    const [pendingId, inProgressId] = await Promise.all([
      orderStatusId(this.prisma, ORDER_STATUS.PENDING),
      orderStatusId(this.prisma, ORDER_STATUS.IN_PROGRESS),
    ]);
    const [pendingOrders, inProgressOrders] = await Promise.all([
      this.prisma.order.count({ where: { ...owner, statusId: pendingId, deleted: false } }),
      this.prisma.order.count({ where: { ...owner, statusId: inProgressId, deleted: false } }),
    ]);
    return { pendingOrders, inProgressOrders };
  }

  private async requireEstablishment(userId: number): Promise<{ id: number }> {
    const establishment = await this.prisma.establishment.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!establishment) throw new NotFoundException('Establishment not found.');
    return establishment;
  }

  private async requireBeneficiaryEntity(userId: number): Promise<{ id: number }> {
    const entity = await this.prisma.beneficiaryEntity.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Beneficiary entity not found.');
    return entity;
  }
}

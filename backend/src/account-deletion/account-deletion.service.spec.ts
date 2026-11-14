import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { OrderCancelledBy, Prisma } from '../../generated/prisma/client';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { SYSTEM_CANCELLATION_REASON } from '../catalog/cancellation-reasons.constants';
import { FOOD_STATUS } from '../foods/foods.constants';
import { ORDER_STATUS } from '../orders/orders.constants';
import { PrismaService } from '../prisma/prisma.service';
import { INVALID_PASSWORD } from './account-deletion.constants';
import { AccountDeletionService } from './account-deletion.service';

const STATUS_ID = {
  [ORDER_STATUS.PENDING]: 1,
  [ORDER_STATUS.IN_PROGRESS]: 2,
  [ORDER_STATUS.REJECTED]: 3,
  [ORDER_STATUS.DONATED]: 4,
  [ORDER_STATUS.CANCELLED]: 5,
} as const;

const FOOD_STATUS_ID = {
  [FOOD_STATUS.ACTIVE]: 10,
  [FOOD_STATUS.RESERVED]: 20,
  [FOOD_STATUS.INACTIVE]: 30,
} as const;

const REASON_ID = 9;

type Raw = TemplateStringsArray | Prisma.Sql;
const rawText = (sql: Raw): string => ('strings' in sql ? sql.strings : sql).join('?');

describe('AccountDeletionService', () => {
  let institutionDeleted: boolean;

  const prismaMock = {
    establishment: {
      findUnique: jest.fn<(args: unknown) => Promise<unknown>>(),
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    beneficiaryEntity: {
      findUnique: jest.fn<(args: unknown) => Promise<unknown>>(),
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    account: { findFirst: jest.fn<(args: unknown) => Promise<unknown>>() },
    user: { update: jest.fn<(args: unknown) => Promise<unknown>>() },
    session: { deleteMany: jest.fn<(args: unknown) => Promise<unknown>>() },
    cancellationReason: { findUniqueOrThrow: jest.fn<(args: unknown) => Promise<unknown>>() },
    orderStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    foodStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    order: {
      count: jest.fn<(args: unknown) => Promise<number>>(),
      findMany: jest.fn<(args: unknown) => Promise<unknown[]>>(),
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
    },
    food: {
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
      findUniqueOrThrow: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    $transaction: jest.fn<(cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
    $queryRaw: jest.fn<(sql: Raw, ...values: unknown[]) => Promise<unknown>>(),
  };

  const verify = jest.fn<(data: { password: string; hash: string }) => Promise<boolean>>();
  const authMock = { $context: Promise.resolve({ password: { verify } }) };

  let service: AccountDeletionService;

  const updateManyCalls = (): unknown[] => prismaMock.order.updateMany.mock.calls.map((c) => c[0]);
  const rawCalls = (): string[] => prismaMock.$queryRaw.mock.calls.map((c) => rawText(c[0]));

  beforeEach(async () => {
    jest.clearAllMocks();
    institutionDeleted = false;
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 3 });
    prismaMock.beneficiaryEntity.findUnique.mockResolvedValue({ id: 7 });
    prismaMock.account.findFirst.mockResolvedValue({ password: 'hash' });
    verify.mockResolvedValue(true);
    prismaMock.cancellationReason.findUniqueOrThrow.mockResolvedValue({ id: REASON_ID });
    prismaMock.orderStatus.findUniqueOrThrow.mockImplementation((args) =>
      Promise.resolve({ id: STATUS_ID[args.where.name as keyof typeof STATUS_ID] }),
    );
    prismaMock.foodStatus.findUniqueOrThrow.mockImplementation((args) =>
      Promise.resolve({ id: FOOD_STATUS_ID[args.where.name as keyof typeof FOOD_STATUS_ID] }),
    );
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.food.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.food.findUniqueOrThrow.mockResolvedValue({
      id: 5,
      quantity: new Prisma.Decimal(2),
      deleted: false,
      status: { name: FOOD_STATUS.ACTIVE },
    });
    prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
    prismaMock.$queryRaw.mockImplementation((sql) =>
      Promise.resolve(
        /FROM (establishment|beneficiary_entity) WHERE id = \? FOR UPDATE/.test(rawText(sql))
          ? [{ deleted: institutionDeleted }]
          : [],
      ),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountDeletionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BETTER_AUTH, useValue: authMock },
      ],
    }).compile();
    service = moduleRef.get(AccountDeletionService);
  });

  describe('impact', () => {
    it('counts the establishment orders "Pendente" and "Em andamento", not deleted', async () => {
      prismaMock.order.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      await expect(service.establishmentImpact(30)).resolves.toEqual({
        pendingOrders: 2,
        inProgressOrders: 1,
      });
      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { establishmentId: 3, statusId: 1, deleted: false },
      });
      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { establishmentId: 3, statusId: 2, deleted: false },
      });
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('counts the entity orders', async () => {
      prismaMock.order.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      await expect(service.beneficiaryEntityImpact(20)).resolves.toEqual({
        pendingOrders: 3,
        inProgressOrders: 2,
      });
      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { beneficiaryEntityId: 7, statusId: 1, deleted: false },
      });
    });

    it('answers 404 to the other institution type', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(service.establishmentImpact(20)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.beneficiaryEntityImpact(30)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('password', () => {
    it('refuses a wrong password with INVALID_PASSWORD and writes nothing', async () => {
      verify.mockResolvedValue(false);

      const error = await service.deleteOwnEstablishment(30, 'wrong').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: INVALID_PASSWORD,
      });
      expect(verify).toHaveBeenCalledWith({ hash: 'hash', password: 'wrong' });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.session.deleteMany).not.toHaveBeenCalled();
    });

    it('refuses an account without a credential password', async () => {
      prismaMock.account.findFirst.mockResolvedValue(null);

      await expect(service.deleteOwnBeneficiaryEntity(20, 'x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(verify).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('checks the credential account of the session user', async () => {
      await service.deleteOwnEstablishment(30, 'secret');

      expect(prismaMock.account.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 30, providerId: 'credential' } }),
      );
    });
  });

  describe('deleteOwnEstablishment (RN28)', () => {
    it('rejects pending orders and cancels the ones in progress with the system reason', async () => {
      await service.deleteOwnEstablishment(30, 'secret');

      expect(prismaMock.cancellationReason.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { name: SYSTEM_CANCELLATION_REASON.ACCOUNT_CLOSED, isSystem: true },
      });
      expect(updateManyCalls()).toContainEqual({
        where: { establishmentId: 3, statusId: 1, deleted: false },
        data: { statusId: 3 },
      });
      expect(updateManyCalls()).toContainEqual({
        where: { establishmentId: 3, statusId: 2, deleted: false },
        data: {
          statusId: 5,
          cancellationReasonId: REASON_ID,
          cancelledBy: OrderCancelledBy.ESTABLISHMENT,
        },
      });
    });

    it('gives no stock back and never marks orders as deleted', async () => {
      await service.deleteOwnEstablishment(30, 'secret');

      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(updateManyCalls()).not.toContainEqual(
        expect.objectContaining({ data: { deleted: true } }),
      );
      expect(updateManyCalls()).toHaveLength(2);
    });

    it('deletes every food, keeping its status, then the establishment and the user', async () => {
      await service.deleteOwnEstablishment(30, 'secret');

      expect(prismaMock.food.updateMany).toHaveBeenCalledWith({
        where: { establishmentId: 3, deleted: false },
        data: { deleted: true },
      });
      expect(prismaMock.establishment.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { deleted: true },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 30 },
        data: { deleted: true },
      });
      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 30 } });
    });

    it('locks the establishment, then its foods by id, before changing any order', async () => {
      await service.deleteOwnEstablishment(30, 'secret');

      const raw = rawCalls();
      expect(raw[0]).toContain('FROM establishment WHERE id = ? FOR UPDATE');
      expect(raw[1]).toContain('FROM food');
      expect(raw[1]).toContain('ORDER BY id FOR UPDATE');
      expect(prismaMock.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
        prismaMock.order.updateMany.mock.invocationCallOrder[0],
      );
    });

    it('checks the password before opening the transaction', async () => {
      await service.deleteOwnEstablishment(30, 'secret');

      expect(verify.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.$transaction.mock.invocationCallOrder[0],
      );
    });

    it('changes nothing when a concurrent deletion already closed the establishment', async () => {
      institutionDeleted = true;

      await expect(service.deleteOwnEstablishment(30, 'secret')).resolves.toBeUndefined();
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.session.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteOwnBeneficiaryEntity (RN29)', () => {
    const inProgress = { id: 61, statusId: 2, foodId: 8, quantity: new Prisma.Decimal(3) };
    const pending = { id: 60, statusId: 1, foodId: 5, quantity: new Prisma.Decimal(1) };

    const cancelData = {
      statusId: 5,
      cancellationReasonId: REASON_ID,
      cancelledBy: OrderCancelledBy.BENEFICIARY_ENTITY,
    };

    beforeEach(() => {
      prismaMock.order.findMany.mockImplementation((args) =>
        Promise.resolve(
          (args as { distinct?: unknown }).distinct
            ? [{ foodId: 8 }, { foodId: 5 }]
            : [pending, inProgress],
        ),
      );
    });

    it('cancels the pending orders with the system reason and BENEFICIARY_ENTITY', async () => {
      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(updateManyCalls()).toContainEqual({
        where: { beneficiaryEntityId: 7, statusId: 1, deleted: false },
        data: cancelData,
      });
    });

    it('cancels each order in progress and gives its quantity back to the food', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue({
        id: 8,
        quantity: new Prisma.Decimal(2),
        deleted: false,
        status: { name: FOOD_STATUS.ACTIVE },
      });

      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(updateManyCalls()).toContainEqual({
        where: { id: 61, statusId: 2, deleted: false },
        data: cancelData,
      });
      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: { quantity: { increment: inProgress.quantity } },
      });
    });

    it('puts a "Reservado" food back to "Ativo"', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue({
        id: 8,
        quantity: new Prisma.Decimal(0),
        deleted: false,
        status: { name: FOOD_STATUS.RESERVED },
      });

      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: { quantity: { increment: inProgress.quantity }, statusId: 10 },
      });
    });

    it('makes the total pending orders of the food follow the stock given back (DT32)', async () => {
      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(updateManyCalls()).toContainEqual(
        expect.objectContaining({
          where: expect.objectContaining({ foodId: 8, statusId: 1, type: 'TOTAL' }),
          data: expect.objectContaining({ quantity: 5 }),
        }),
      );
    });

    it('gives nothing back to a deleted food (DT27)', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue({
        id: 8,
        quantity: new Prisma.Decimal(2),
        deleted: true,
        status: { name: FOOD_STATUS.ACTIVE },
      });

      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(prismaMock.food.update).not.toHaveBeenCalled();
    });

    it('skips the give-back of an order that left "Em andamento" meanwhile', async () => {
      prismaMock.order.updateMany.mockImplementation((args) =>
        Promise.resolve({
          count: (args as { where: { id?: number } }).where.id === 61 ? 0 : 1,
        }),
      );

      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(prismaMock.food.update).not.toHaveBeenCalled();
    });

    it('locks the entity, then the foods of its open orders in id order', async () => {
      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      const raw = rawCalls();
      expect(raw[0]).toContain('FROM beneficiary_entity WHERE id = ? FOR UPDATE');
      expect(raw[1]).toContain('FROM food WHERE id IN');
      expect((prismaMock.$queryRaw.mock.calls[1][1] as Prisma.Sql).values).toEqual([5, 8]);
      expect(prismaMock.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
        prismaMock.order.updateMany.mock.invocationCallOrder[0],
      );
    });

    it('marks deleted every order except "Doado"/"Cancelado" of a live establishment, after the cancels', async () => {
      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      const calls = updateManyCalls();
      const hide = {
        where: {
          beneficiaryEntityId: 7,
          deleted: false,
          NOT: { statusId: { in: [4, 5] }, establishment: { deleted: false } },
        },
        data: { deleted: true },
      };
      expect(calls).toContainEqual(hide);
      expect(calls.at(-1)).toEqual(hide);
    });

    it('closes the entity and the user and deletes the sessions', async () => {
      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(prismaMock.beneficiaryEntity.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { deleted: true },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { deleted: true },
      });
      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 20 } });
    });

    it('locks no food when the entity has no open order', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);

      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(rawCalls()).toHaveLength(1);
      expect(prismaMock.beneficiaryEntity.update).toHaveBeenCalled();
    });

    it('changes nothing when a concurrent deletion already closed the entity', async () => {
      institutionDeleted = true;

      await service.deleteOwnBeneficiaryEntity(20, 'secret');

      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(prismaMock.session.deleteMany).not.toHaveBeenCalled();
    });

    it('rolls back on failure: the error leaves the transaction', async () => {
      prismaMock.beneficiaryEntity.update.mockRejectedValue(new Error('db down'));

      await expect(service.deleteOwnBeneficiaryEntity(20, 'secret')).rejects.toThrow('db down');
      expect(prismaMock.session.deleteMany).not.toHaveBeenCalled();
    });
  });
});

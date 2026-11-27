import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { FoodRequestType, OrderType, Prisma } from '../../../generated/prisma/client';
import { AuditService } from '../../audit/audit.service';
import type { ValidatedImage } from '../../files/image-file.pipe';
import { ImageStorageService } from '../../files/image-storage.service';
import { dateInBrasilia } from '../../foods/food-dates';
import {
  EXPIRATION_DATE_IN_PAST,
  FOOD_HAS_ORDERS_IN_PROGRESS,
  FOOD_NOT_ACTIVE,
  FOOD_STATUS,
  FRACTION_NOT_ALLOWED,
  INVALID_CATALOG_ITEM,
  INVALID_MEASUREMENT_UNIT,
  PARTIAL_ONLY_QUANTITY_TOO_LOW,
} from '../../foods/foods.constants';
import { ORDER_STATUS } from '../../orders/orders.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { FOOD_DELETED, PUBLISHED_AT_IN_FUTURE } from './admin-food.errors';
import { AdminFoodsService } from './admin-foods.service';

const fn = <T extends (...args: never[]) => unknown>() => jest.fn<T>();
type Any = (args?: unknown) => Promise<unknown>;

const ORDER_STATUS_ID: Record<string, number> = {
  [ORDER_STATUS.PENDING]: 1,
  [ORDER_STATUS.IN_PROGRESS]: 2,
  [ORDER_STATUS.REJECTED]: 3,
  [ORDER_STATUS.DONATED]: 4,
  [ORDER_STATUS.CANCELLED]: 5,
};

const actor = { id: 1, name: 'Admin', email: 'admin@foodshare.com.br' };
const image: ValidatedImage = { buffer: Buffer.from('x'), type: 'webp' };

function food(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    image: 'foods/old.webp',
    quantity: new Prisma.Decimal(5),
    requestType: FoodRequestType.TOTAL_OR_PARTIAL,
    description: 'Pães do dia.',
    notes: 'Retirar até as 18h.',
    expirationDate: new Date('2026-11-20T00:00:00.000Z'),
    publishedAt: new Date('2026-11-06T01:00:00.000Z'), // 05/11 22h in Brasília
    deleted: false,
    catalogItemId: 13,
    measurementUnitId: 1,
    establishmentId: 30,
    catalogItem: { id: 13, name: 'Pão francês', category: { id: 6, name: 'Pães e Massas' } },
    measurementUnit: { id: 1, name: 'Unidade', abbreviation: 'un', allowsFraction: false },
    status: { id: 10, name: FOOD_STATUS.ACTIVE },
    establishment: {
      id: 30,
      companyName: 'Padaria São José Ltda',
      tradeName: 'Padaria São José',
      deleted: false,
    },
    _count: { orders: 0 },
    ...overrides,
  };
}

describe('AdminFoodsService', () => {
  const prismaMock = {
    food: {
      findMany: fn<Any>(),
      findUnique: fn<Any>(),
      update: fn<Any>(),
      delete: fn<Any>(),
    },
    foodCatalogItem: { findUnique: fn<Any>() },
    measurementUnit: { findUnique: fn<Any>() },
    orderStatus: {
      findMany: fn<Any>(),
      findUniqueOrThrow: fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    order: {
      count: fn<(args: { where: Record<string, unknown> }) => Promise<number>>(),
      groupBy: fn<Any>(),
      findMany: fn<Any>(),
      updateMany: fn<(args: unknown) => Promise<{ count: number }>>(),
      deleteMany: fn<(args: unknown) => Promise<{ count: number }>>(),
    },
    $queryRaw: fn<(...args: unknown[]) => Promise<unknown>>(),
    $transaction: fn<(cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
  };
  const storageMock = {
    toUrl: (key: string | null) => (key ? `https://api/files/${key}` : null),
    store: fn<(folder: string, image: ValidatedImage) => Promise<string>>(),
    removeQuietly: fn<(key: string) => Promise<void>>(),
  };
  const auditMock = { record: fn<(tx: unknown, entry: unknown) => Promise<void>>() };

  let service: AdminFoodsService;
  let current: ReturnType<typeof food> | null;

  const auditEntry = () => auditMock.record.mock.calls[0]?.[1] as Record<string, unknown>;
  const errorOf = (run: Promise<unknown>) => run.catch((error: unknown) => error);
  const expectRefused = async (run: Promise<unknown>, type: unknown, code?: string) => {
    const error = await errorOf(run);
    expect(error).toBeInstanceOf(type);
    if (code) {
      expect((error as BadRequestException).getResponse()).toMatchObject({ code });
    }
    expect(prismaMock.food.update).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(auditMock.record).not.toHaveBeenCalled();
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    current = food();
    prismaMock.food.findUnique.mockImplementation(() => Promise.resolve(current));
    prismaMock.food.findMany.mockResolvedValue([]);
    prismaMock.food.update.mockResolvedValue({});
    prismaMock.food.delete.mockResolvedValue({});
    prismaMock.foodCatalogItem.findUnique.mockResolvedValue({ id: 14, name: 'Arroz, integral' });
    prismaMock.measurementUnit.findUnique.mockResolvedValue({
      id: 2,
      name: 'Quilograma',
      abbreviation: 'kg',
      allowsFraction: true,
    });
    prismaMock.orderStatus.findMany.mockResolvedValue(
      Object.entries(ORDER_STATUS_ID).map(([name, id]) => ({ id, name })),
    );
    prismaMock.orderStatus.findUniqueOrThrow.mockImplementation(({ where }) =>
      Promise.resolve({ id: ORDER_STATUS_ID[where.name], name: where.name }),
    );
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.groupBy.mockResolvedValue([]);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.$queryRaw.mockResolvedValue([{ id: 30 }]);
    prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
    storageMock.store.mockResolvedValue('foods/new.webp');
    storageMock.removeQuietly.mockResolvedValue(undefined);
    auditMock.record.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminFoodsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ImageStorageService, useValue: storageMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = moduleRef.get(AdminFoodsService);
  });

  describe('list (RF52, DT60)', () => {
    const rows = [
      food({ id: 1, publishedAt: new Date('2026-11-01T12:00:00.000Z') }),
      food({
        id: 2,
        publishedAt: new Date('2026-11-03T12:00:00.000Z'),
        catalogItem: {
          id: 14,
          name: 'Arroz, integral',
          category: { id: 2, name: 'Grãos e cereais' },
        },
        establishment: { id: 31, companyName: 'Mercado Ltda', tradeName: null, deleted: true },
        deleted: true,
      }),
      food({ id: 3, publishedAt: new Date('2026-11-02T12:00:00.000Z'), _count: { orders: 1 } }),
    ];

    beforeEach(() => {
      prismaMock.food.findMany.mockResolvedValue(rows);
    });

    it('brings every status and the soft-deleted ones, newest publication first', async () => {
      const result = await service.list({});

      expect(prismaMock.food.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result.total).toBe(3);
      expect(result.data.map((row) => row.id)).toEqual([2, 3, 1]);
      expect(result.data[0]).toMatchObject({
        deleted: true,
        establishment: { id: 31, publicName: 'Mercado Ltda', deleted: true },
        image: 'https://api/files/foods/old.webp',
        quantity: '5.00',
        ordersInProgress: 0,
      });
      expect(result.data[1].ordersInProgress).toBe(1);
    });

    it('filters by status and by situation in the query', async () => {
      await service.list({ status: FOOD_STATUS.RESERVED, situation: 'deleted' });

      expect(prismaMock.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { name: FOOD_STATUS.RESERVED }, deleted: true },
        }),
      );
    });

    it('finds by establishment trade name without accents', async () => {
      const result = await service.list({ search: 'padaria sao jose' });
      expect(result.data.map((row) => row.id).sort()).toEqual([1, 3]);
    });

    it('finds by category', async () => {
      const result = await service.list({ search: 'graos' });
      expect(result.data.map((row) => row.id)).toEqual([2]);
    });

    it('finds by publication day in Brasília', async () => {
      prismaMock.food.findMany.mockResolvedValue([food()]); // 06/11 01h UTC = 05/11 22h
      expect((await service.list({ search: '05/11' })).total).toBe(1);
      expect((await service.list({ search: '06/11' })).total).toBe(0);
    });

    it('sorts by the requested field', async () => {
      const result = await service.list({ sort: 'name', order: 'asc' });
      expect(result.data[0].name).toBe('Arroz, integral');
    });
  });

  describe('get (RF53)', () => {
    it('returns a food of a deleted establishment with the order counts', async () => {
      current = food({
        deleted: true,
        establishment: { id: 30, companyName: 'X Ltda', tradeName: null, deleted: true },
      });
      prismaMock.order.groupBy.mockResolvedValue([
        { statusId: ORDER_STATUS_ID[ORDER_STATUS.IN_PROGRESS], _count: { _all: 1 } },
        { statusId: ORDER_STATUS_ID[ORDER_STATUS.DONATED], _count: { _all: 3 } },
      ]);

      const detail = await service.get(100);

      expect(detail).toMatchObject({
        deleted: true,
        catalogItemId: 13,
        notes: 'Retirar até as 18h.',
        establishment: { deleted: true, publicName: 'X Ltda' },
        ordersInProgress: 1,
        orders: { pending: 0, inProgress: 1, rejected: 0, donated: 3, cancelled: 0 },
      });
      expect(prismaMock.order.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { foodId: 100 } }),
      );
    });

    it('answers 404 for an unknown id', async () => {
      current = null;
      await expect(service.get(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update accepted (RF50, DT57, DT58)', () => {
    it('changes catalog item and description, rejects the pending orders and audits', async () => {
      prismaMock.order.updateMany.mockResolvedValue({ count: 2 });

      await service.update(actor, 100, { catalogItemId: 14, description: 'Arroz em pacotes.' });

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { catalogItemId: 14, description: 'Arroz em pacotes.' },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { foodId: 100, statusId: 1, deleted: false },
        data: { statusId: 3 },
      });
      expect(auditEntry()).toMatchObject({
        action: 'food.update',
        entityType: 'Food',
        entityId: 100,
        details: {
          changes: {
            catalogItem: { from: 'Pão francês', to: 'Arroz, integral' },
            description: { from: 'Pães do dia.', to: 'Arroz em pacotes.' },
          },
          updatedOrders: 0,
          rejectedOrders: 2,
        },
      });
    });

    it('applies RN20 when only the quantity changes and audits only the quantity', async () => {
      await service.update(actor, 100, { quantity: 4 });

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { quantity: 4 },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: OrderType.PARTIAL, quantity: { gt: 4 } }),
        }),
      );
      expect(auditEntry().details).toEqual({
        changes: { quantity: { from: 5, to: 4 } },
        updatedOrders: 0,
        rejectedOrders: 0,
      });
    });

    it('stores a past publication day as midnight in Brasília', async () => {
      await service.update(actor, 100, { publishedAt: '2026-11-01' });

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { publishedAt: new Date('2026-11-01T03:00:00.000Z') },
      });
    });

    it('keeps the original time when the publication day sent is the current one', async () => {
      await service.update(actor, 100, { publishedAt: '2026-11-05' });
      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it('accepts an expired food when the expiration date is not sent (DT26)', async () => {
      current = food({ expirationDate: new Date('2020-01-01T00:00:00.000Z') });
      await service.update(actor, 100, { description: 'Corrigida.' });
      expect(prismaMock.food.update).toHaveBeenCalled();
    });

    it('clears the notes', async () => {
      await service.update(actor, 100, { notes: null });
      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { notes: null },
      });
    });

    it('replaces the image and removes the old one only after the commit', async () => {
      const order: string[] = [];
      prismaMock.$transaction.mockImplementation(async (cb) => {
        const result = await cb(prismaMock);
        order.push('commit');
        return result;
      });
      storageMock.removeQuietly.mockImplementation((key) => {
        order.push(`remove ${key}`);
        return Promise.resolve();
      });

      await service.update(actor, 100, {}, image);

      expect(storageMock.store).toHaveBeenCalledWith('foods', image);
      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { image: 'foods/new.webp' },
      });
      expect(order).toEqual(['commit', 'remove foods/old.webp']);
    });

    it('locks the establishment, then the food', async () => {
      await service.update(actor, 100, { description: 'Outra.' });
      const sql = prismaMock.$queryRaw.mock.calls.map((call) =>
        (call[0] as TemplateStringsArray).join('?'),
      );
      expect(sql[0]).toContain('FROM establishment');
      expect(sql[0]).toContain('FOR SHARE');
      expect(sql[1]).toBe('SELECT id FROM food WHERE id = ? FOR UPDATE');
    });

    it('does nothing when the values sent are the current ones', async () => {
      await service.update(actor, 100, { quantity: 5, description: 'Pães do dia.' });
      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });
  });

  describe('update refused', () => {
    it.each([FOOD_STATUS.RESERVED, FOOD_STATUS.INACTIVE])('%s → FOOD_NOT_ACTIVE', async (name) => {
      current = food({ status: { id: 20, name } });
      await expectRefused(
        service.update(actor, 100, { quantity: 4 }),
        ConflictException,
        FOOD_NOT_ACTIVE,
      );
    });

    it('order in progress → FOOD_HAS_ORDERS_IN_PROGRESS', async () => {
      prismaMock.order.count.mockResolvedValue(1);
      await expectRefused(
        service.update(actor, 100, { quantity: 4 }),
        ConflictException,
        FOOD_HAS_ORDERS_IN_PROGRESS,
      );
    });

    it('soft-deleted food → FOOD_DELETED', async () => {
      current = food({ deleted: true });
      await expectRefused(
        service.update(actor, 100, { quantity: 4 }),
        ConflictException,
        FOOD_DELETED,
      );
    });

    it('unit without fraction for 2.5 → FRACTION_NOT_ALLOWED', async () => {
      current = food({
        quantity: new Prisma.Decimal(2.5),
        measurementUnit: { id: 2, name: 'Quilograma', abbreviation: 'kg', allowsFraction: true },
        measurementUnitId: 2,
      });
      prismaMock.measurementUnit.findUnique.mockResolvedValue({
        id: 1,
        name: 'Unidade',
        abbreviation: 'un',
        allowsFraction: false,
      });
      await expectRefused(
        service.update(actor, 100, { measurementUnitId: 1 }),
        BadRequestException,
        FRACTION_NOT_ALLOWED,
      );
    });

    it('PARTIAL_ONLY with 1 unit → PARTIAL_ONLY_QUANTITY_TOO_LOW', async () => {
      current = food({ quantity: new Prisma.Decimal(1) });
      await expectRefused(
        service.update(actor, 100, { requestType: FoodRequestType.PARTIAL_ONLY }),
        BadRequestException,
        PARTIAL_ONLY_QUANTITY_TOO_LOW,
      );
    });

    it('changed expiration in the past → EXPIRATION_DATE_IN_PAST', async () => {
      await expectRefused(
        service.update(actor, 100, { expirationDate: '2020-01-01' }),
        BadRequestException,
        EXPIRATION_DATE_IN_PAST,
      );
    });

    it('publication tomorrow → PUBLISHED_AT_IN_FUTURE', async () => {
      const tomorrow = dateInBrasilia(new Date(Date.now() + 24 * 60 * 60 * 1000));
      await expectRefused(
        service.update(actor, 100, { publishedAt: tomorrow }),
        BadRequestException,
        PUBLISHED_AT_IN_FUTURE,
      );
    });

    it('unknown catalog item and unit → INVALID_*', async () => {
      prismaMock.foodCatalogItem.findUnique.mockResolvedValue(null);
      prismaMock.measurementUnit.findUnique.mockResolvedValue(null);
      await expectRefused(
        service.update(actor, 100, { catalogItemId: 99 }),
        BadRequestException,
        INVALID_CATALOG_ITEM,
      );
      await expectRefused(
        service.update(actor, 100, { measurementUnitId: 99 }),
        BadRequestException,
        INVALID_MEASUREMENT_UNIT,
      );
    });

    it('nothing sent → 400', async () => {
      await expectRefused(service.update(actor, 100, {}), BadRequestException);
    });

    it('unknown food → 404', async () => {
      current = null;
      await expectRefused(service.update(actor, 100, { quantity: 4 }), NotFoundException);
    });

    it('removes the new image and keeps the old one when refused', async () => {
      current = food({ status: { id: 30, name: FOOD_STATUS.INACTIVE } });
      await expectRefused(
        service.update(actor, 100, {}, image),
        ConflictException,
        FOOD_NOT_ACTIVE,
      );
      expect(storageMock.removeQuietly).toHaveBeenCalledTimes(1);
      expect(storageMock.removeQuietly).toHaveBeenCalledWith('foods/new.webp');
    });
  });

  describe('editImpact (DT58)', () => {
    it('counts every pending order as rejected for another unit, without writing', async () => {
      prismaMock.order.count.mockResolvedValue(3);

      expect(await service.editImpact(100, { measurementUnitId: 2 })).toEqual({
        ordersToUpdate: 0,
        ordersToReject: 3,
      });
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('answers zeros for the current values', async () => {
      prismaMock.order.count.mockResolvedValue(3);
      expect(await service.editImpact(100, { quantity: 5, catalogItemId: 13 })).toEqual({
        ordersToUpdate: 0,
        ordersToReject: 0,
      });
      expect(prismaMock.order.count).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown food', async () => {
      current = null;
      await expect(service.editImpact(999, {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove (RF51, DT59)', () => {
    beforeEach(() => {
      prismaMock.order.groupBy.mockResolvedValue([
        { statusId: ORDER_STATUS_ID[ORDER_STATUS.PENDING], _count: { _all: 1 } },
        { statusId: ORDER_STATUS_ID[ORDER_STATUS.DONATED], _count: { _all: 2 } },
      ]);
      prismaMock.order.findMany.mockResolvedValue([{ id: 7 }, { id: 8 }, { id: 9 }]);
      prismaMock.order.deleteMany.mockResolvedValue({ count: 3 });
    });

    it('deletes the orders and the food, audits and removes the image after the commit', async () => {
      const order: string[] = [];
      prismaMock.$transaction.mockImplementation(async (cb) => {
        const result = await cb(prismaMock);
        order.push('commit');
        return result;
      });
      prismaMock.order.deleteMany.mockImplementation(() => {
        order.push('orders');
        return Promise.resolve({ count: 3 });
      });
      prismaMock.food.delete.mockImplementation(() => {
        order.push('food');
        return Promise.resolve({});
      });
      storageMock.removeQuietly.mockImplementation((key) => {
        order.push(`remove ${key}`);
        return Promise.resolve();
      });

      await service.remove(actor, 100);

      expect(prismaMock.order.deleteMany).toHaveBeenCalledWith({ where: { foodId: 100 } });
      expect(order).toEqual(['orders', 'food', 'commit', 'remove foods/old.webp']);
      expect(auditEntry()).toMatchObject({
        action: 'food.delete',
        entityId: 100,
        details: {
          foodName: 'Pão francês',
          establishment: { id: 30, companyName: 'Padaria São José Ltda' },
          deletedOrders: { pending: 1, inProgress: 0, rejected: 0, donated: 2, cancelled: 0 },
        },
      });
    });

    it('accepts a soft-deleted food', async () => {
      current = food({ deleted: true });
      await expect(service.remove(actor, 100)).resolves.toBeUndefined();
    });

    it('answers 404 for an unknown food', async () => {
      current = null;
      await expect(service.remove(actor, 999)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.food.delete).not.toHaveBeenCalled();
    });

    it('answers 404 when the food disappears while waiting for the lock', async () => {
      prismaMock.food.findUnique
        .mockResolvedValueOnce({ establishmentId: 30 })
        .mockResolvedValueOnce(null);
      await expect(service.remove(actor, 100)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.deleteMany).not.toHaveBeenCalled();
    });

    it('keeps the image when the transaction fails', async () => {
      auditMock.record.mockRejectedValue(new Error('audit down'));
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      await expect(service.remove(actor, 100)).rejects.toThrow('audit down');
      expect(storageMock.removeQuietly).not.toHaveBeenCalled();
    });

    it('keeps the deletion when removing the image fails', async () => {
      storageMock.removeQuietly.mockResolvedValue(undefined); // removeQuietly logs and swallows
      await expect(service.remove(actor, 100)).resolves.toBeUndefined();
      expect(storageMock.removeQuietly).toHaveBeenCalledWith('foods/old.webp');
    });
  });
});

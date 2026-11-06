import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { FoodRequestType, OrderType, Prisma } from '../../generated/prisma/client';
import { ImageStorageService } from '../files/image-storage.service';
import { ORDER_STATUS } from '../orders/orders.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  CANCELLATION_REASON_REQUIRED,
  EXPIRATION_DATE_IN_PAST,
  FOOD_HAS_ORDERS_IN_PROGRESS,
  FOOD_NOT_ACTIVE,
  FOOD_NOT_INACTIVE,
  FOOD_STATUS,
  FRACTION_NOT_ALLOWED,
  INVALID_CANCELLATION_REASON,
  PARTIAL_ONLY_QUANTITY_TOO_LOW,
} from './foods.constants';
import { FoodsService } from './foods.service';

const ORDER_STATUS_ID: Record<string, number> = {
  [ORDER_STATUS.PENDING]: 1,
  [ORDER_STATUS.IN_PROGRESS]: 2,
  [ORDER_STATUS.REJECTED]: 3,
  [ORDER_STATUS.DONATED]: 4,
  [ORDER_STATUS.CANCELLED]: 5,
};
const INACTIVE_STATUS_ID = 30;
const ACTIVE_STATUS_ID = 10;

describe('FoodsService management', () => {
  const foodRow = {
    id: 100,
    image: 'foods/a.webp',
    quantity: new Prisma.Decimal(5),
    requestType: FoodRequestType.TOTAL_OR_PARTIAL,
    description: 'Pães do dia.',
    notes: null,
    expirationDate: new Date('2099-12-31'),
    publishedAt: new Date('2026-08-28T12:00:00.000Z'),
    catalogItem: { id: 13, name: 'Pão francês', category: { id: 6, name: 'Pães e Massas' } },
    measurementUnit: { id: 1, name: 'Unidade', abbreviation: 'un', allowsFraction: false },
    status: { id: ACTIVE_STATUS_ID, name: FOOD_STATUS.ACTIVE },
    establishment: {
      id: 30,
      companyName: 'Test Ltd',
      tradeName: null,
      address: { city: 'Birigui', state: 'SP' },
    },
  };
  const withStatus = (name: string, id: number) => ({ ...foodRow, status: { id, name } });

  const prismaMock = {
    establishment: { findUnique: jest.fn<(args: unknown) => Promise<unknown>>() },
    foodStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    orderStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    cancellationReason: { findUnique: jest.fn<(args: unknown) => Promise<unknown>>() },
    food: {
      findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
      findMany: jest.fn<(args: unknown) => Promise<unknown>>(),
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    order: {
      count: jest.fn<(args: unknown) => Promise<number>>(),
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
      groupBy: jest.fn<(args: unknown) => Promise<unknown[]>>(),
    },
    $queryRaw: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    $transaction: jest.fn<(cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
  };

  const storageMock = { toUrl: (key: string | null) => key };

  const errorOf = async (run: Promise<unknown>) => run.catch((error: unknown) => error);
  const expectCode = async (run: Promise<unknown>, type: unknown, code: string) => {
    const error = await errorOf(run);
    expect(error).toBeInstanceOf(type);
    expect((error as BadRequestException).getResponse()).toMatchObject({ code });
    expect(prismaMock.food.update).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  };

  let service: FoodsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 30, userId: 20 });
    prismaMock.orderStatus.findUniqueOrThrow.mockImplementation(({ where }) =>
      Promise.resolve({ id: ORDER_STATUS_ID[where.name], name: where.name }),
    );
    prismaMock.foodStatus.findUniqueOrThrow.mockImplementation(({ where }) =>
      Promise.resolve({
        id: where.name === FOOD_STATUS.INACTIVE ? INACTIVE_STATUS_ID : ACTIVE_STATUS_ID,
        name: where.name,
      }),
    );
    prismaMock.food.findFirst.mockResolvedValue(foodRow);
    prismaMock.food.findMany.mockResolvedValue([foodRow]);
    prismaMock.food.update.mockResolvedValue(foodRow);
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.groupBy.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));

    const moduleRef = await Test.createTestingModule({
      providers: [
        FoodsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ImageStorageService, useValue: storageMock },
      ],
    }).compile();
    service = moduleRef.get(FoodsService);
  });

  describe('ownership', () => {
    it.each([
      ['update', () => service.update(20, 100, { quantity: 4 })],
      ['deactivate', () => service.deactivate(20, 100)],
      [
        'reactivate',
        () => service.reactivate(20, 100, { quantity: 4, expirationDate: '2099-01-01' }),
      ],
      ['remove', () => service.remove(20, 100)],
    ])('%s answers not found for a food not owned or already deleted', async (_name, action) => {
      prismaMock.food.findFirst.mockResolvedValue(null);

      await expect(action()).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.food.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 100, establishmentId: 30, deleted: false } }),
      );
      expect(prismaMock.food.update).not.toHaveBeenCalled();
    });

    it('locks the food before reading it', async () => {
      await service.deactivate(20, 100);

      expect(prismaMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.food.findFirst.mock.invocationCallOrder[0],
      );
    });
  });

  describe('update', () => {
    it('rejects an empty edit', async () => {
      await expect(service.update(20, 100, {})).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      [FOOD_STATUS.RESERVED, 20],
      [FOOD_STATUS.INACTIVE, INACTIVE_STATUS_ID],
    ])('refuses a "%s" food', async (name, id) => {
      prismaMock.food.findFirst.mockResolvedValue(withStatus(name, id));

      await expectCode(
        service.update(20, 100, { quantity: 4 }),
        ConflictException,
        FOOD_NOT_ACTIVE,
      );
    });

    it('refuses a food with orders in progress', async () => {
      prismaMock.order.count.mockResolvedValue(1);

      await expectCode(
        service.update(20, 100, { quantity: 4 }),
        ConflictException,
        FOOD_HAS_ORDERS_IN_PROGRESS,
      );
    });

    it('refuses an expiration date in the past', async () => {
      await expectCode(
        service.update(20, 100, { expirationDate: '2000-01-01' }),
        BadRequestException,
        EXPIRATION_DATE_IN_PAST,
      );
    });

    it('accepts today as expiration date', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await service.update(20, 100, { expirationDate: today });

      expect(prismaMock.food.update).toHaveBeenCalledTimes(1);
    });

    it('refuses a fraction in a unit without fraction', async () => {
      await expectCode(
        service.update(20, 100, { quantity: 1.5 }),
        BadRequestException,
        FRACTION_NOT_ALLOWED,
      );
    });

    it('refuses a quantity too low for "Somente parcial"', async () => {
      prismaMock.food.findFirst.mockResolvedValue({
        ...foodRow,
        requestType: FoodRequestType.PARTIAL_ONLY,
      });

      await expectCode(
        service.update(20, 100, { quantity: 1 }),
        BadRequestException,
        PARTIAL_ONLY_QUANTITY_TOO_LOW,
      );
    });

    it('changing only the expiration date leaves the orders untouched', async () => {
      await service.update(20, 100, { expirationDate: '2099-01-01' });

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { expirationDate: new Date('2099-01-01') },
      });
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('the same quantity leaves the orders untouched', async () => {
      await service.update(20, 100, { quantity: 5 });

      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('a new quantity updates pending total orders and records the date', async () => {
      await service.update(20, 100, { quantity: 6 });

      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: {
          foodId: 100,
          statusId: ORDER_STATUS_ID[ORDER_STATUS.PENDING],
          deleted: false,
          type: OrderType.TOTAL,
          quantity: { not: 6 },
        },
        data: { quantity: 6, quantityUpdatedAt: expect.any(Date) },
      });
    });

    it('a new quantity rejects only the pending partial orders above it', async () => {
      await service.update(20, 100, { quantity: 4 });

      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: {
          foodId: 100,
          statusId: ORDER_STATUS_ID[ORDER_STATUS.PENDING],
          deleted: false,
          type: OrderType.PARTIAL,
          quantity: { gt: 4 },
        },
        data: { statusId: ORDER_STATUS_ID[ORDER_STATUS.REJECTED] },
      });
    });

    it('returns the food with the order counts', async () => {
      prismaMock.order.groupBy.mockResolvedValue([
        { foodId: 100, statusId: ORDER_STATUS_ID[ORDER_STATUS.PENDING], _count: { _all: 2 } },
      ]);

      const result = await service.update(20, 100, { quantity: 6 });

      expect(result).toMatchObject({ id: 100, pendingOrders: 2, inProgressOrders: 0 });
    });
  });

  describe('quantityImpact', () => {
    it('counts the affected orders without changing anything', async () => {
      prismaMock.order.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

      await expect(service.quantityImpact(20, 100, 4)).resolves.toEqual({
        totalOrdersToUpdate: 1,
        partialOrdersToReject: 2,
      });
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.food.update).not.toHaveBeenCalled();
    });

    it('answers zero for the current quantity', async () => {
      await expect(service.quantityImpact(20, 100, 5)).resolves.toEqual({
        totalOrdersToUpdate: 0,
        partialOrdersToReject: 0,
      });
      expect(prismaMock.order.count).not.toHaveBeenCalled();
    });

    it('answers not found for a food of another establishment', async () => {
      prismaMock.food.findFirst.mockResolvedValue(null);

      await expect(service.quantityImpact(20, 100, 4)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('makes the food "Inativo" and rejects the pending orders', async () => {
      await service.deactivate(20, 100);

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { statusId: INACTIVE_STATUS_ID },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: {
          foodId: 100,
          statusId: ORDER_STATUS_ID[ORDER_STATUS.PENDING],
          deleted: false,
        },
        data: { statusId: ORDER_STATUS_ID[ORDER_STATUS.REJECTED] },
      });
    });

    it('refuses a food with orders in progress', async () => {
      prismaMock.order.count.mockResolvedValue(1);

      await expectCode(service.deactivate(20, 100), ConflictException, FOOD_HAS_ORDERS_IN_PROGRESS);
    });

    it('refuses a food that is not "Ativo"', async () => {
      prismaMock.food.findFirst.mockResolvedValue(
        withStatus(FOOD_STATUS.INACTIVE, INACTIVE_STATUS_ID),
      );

      await expectCode(service.deactivate(20, 100), ConflictException, FOOD_NOT_ACTIVE);
    });
  });

  describe('reactivate', () => {
    const dto = { quantity: 8, expirationDate: '2099-01-01' };

    beforeEach(() => {
      prismaMock.food.findFirst.mockResolvedValue(
        withStatus(FOOD_STATUS.INACTIVE, INACTIVE_STATUS_ID),
      );
    });

    it('makes the food "Ativo" with the new values and keeps the publication date', async () => {
      await service.reactivate(20, 100, dto);

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: {
          statusId: ACTIVE_STATUS_ID,
          quantity: 8,
          expirationDate: new Date('2099-01-01'),
        },
      });
    });

    it('refuses an expiration date in the past', async () => {
      await expectCode(
        service.reactivate(20, 100, { ...dto, expirationDate: '2000-01-01' }),
        BadRequestException,
        EXPIRATION_DATE_IN_PAST,
      );
    });

    it('refuses an invalid quantity', async () => {
      await expectCode(
        service.reactivate(20, 100, { ...dto, quantity: 1.5 }),
        BadRequestException,
        FRACTION_NOT_ALLOWED,
      );
    });

    it('refuses a food that is not "Inativo"', async () => {
      prismaMock.food.findFirst.mockResolvedValue(foodRow);

      await expectCode(service.reactivate(20, 100, dto), ConflictException, FOOD_NOT_INACTIVE);
    });
  });

  describe('remove', () => {
    const pendingToRejected = {
      where: { foodId: 100, statusId: ORDER_STATUS_ID[ORDER_STATUS.PENDING], deleted: false },
      data: { statusId: ORDER_STATUS_ID[ORDER_STATUS.REJECTED] },
    };

    it('without orders in progress, needs no reason and only flags the food as deleted', async () => {
      await service.remove(20, 100);

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { deleted: true },
      });
      expect(prismaMock.cancellationReason.findUnique).not.toHaveBeenCalled();
    });

    it('rejects the pending orders', async () => {
      await service.remove(20, 100);

      expect(prismaMock.order.updateMany).toHaveBeenCalledWith(pendingToRejected);
    });

    it('cancels the orders in progress with the reason, without touching stock or status', async () => {
      prismaMock.order.count.mockResolvedValue(2);
      prismaMock.cancellationReason.findUnique.mockResolvedValue({ id: 4, isSystem: false });

      await service.remove(20, 100, 4);

      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { foodId: 100, statusId: ORDER_STATUS_ID[ORDER_STATUS.IN_PROGRESS], deleted: false },
        data: { statusId: ORDER_STATUS_ID[ORDER_STATUS.CANCELLED], cancellationReasonId: 4 },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith(pendingToRejected);
      expect(prismaMock.food.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { deleted: true },
      });
    });

    it('requires a reason when there are orders in progress', async () => {
      prismaMock.order.count.mockResolvedValue(1);

      await expectCode(service.remove(20, 100), BadRequestException, CANCELLATION_REASON_REQUIRED);
    });

    it.each([
      ['missing', null],
      ['a system reason', { id: 4, isSystem: true }],
    ])('refuses a reason that is %s', async (_name, reason) => {
      prismaMock.order.count.mockResolvedValue(1);
      prismaMock.cancellationReason.findUnique.mockResolvedValue(reason);

      await expectCode(
        service.remove(20, 100, 4),
        BadRequestException,
        INVALID_CANCELLATION_REASON,
      );
    });
  });

  describe('listMine', () => {
    const sqlOf = (call: number) => prismaMock.$queryRaw.mock.calls[call][0] as Prisma.Sql;

    beforeEach(() => {
      prismaMock.$queryRaw.mockImplementation((sql) =>
        Promise.resolve(
          (sql as Prisma.Sql).strings.join(' ').includes('count(*)')
            ? [{ count: 1n }]
            : [{ id: 100 }],
        ),
      );
    });

    it('scopes by establishment and leaves deleted foods out', async () => {
      const result = await service.listMine(20, {});

      expect(sqlOf(0).sql).toContain('f.deleted = false');
      expect(sqlOf(0).sql).toContain('f."establishmentId" =');
      expect(sqlOf(0).values).toContain(30);
      expect(result.total).toBe(1);
    });

    it('sorts by most recent publication by default', async () => {
      await service.listMine(20, {});

      expect(sqlOf(0).sql).toContain('ORDER BY f."publishedAt" desc, f.id DESC');
    });

    it('sorts by the mapped column of the requested field', async () => {
      await service.listMine(20, { sort: 'name', order: 'desc' });

      expect(sqlOf(0).sql).toContain('ORDER BY lower(unaccent(ci.name)) desc, f.id DESC');
    });

    it('filters by status', async () => {
      await service.listMine(20, { status: FOOD_STATUS.INACTIVE });

      expect(sqlOf(0).values).toContain(FOOD_STATUS.INACTIVE);
    });

    it('searches text, quantity and dates, normalizing the decimal comma', async () => {
      await service.listMine(20, { search: '2,5' });

      expect(sqlOf(0).sql).toContain('unaccent(ci.name) ILIKE');
      expect(sqlOf(0).sql).toContain('unaccent(cat.name) ILIKE');
      expect(sqlOf(0).sql).toContain('unaccent(f.description) ILIKE');
      expect(sqlOf(0).sql).toContain('f.quantity::text ILIKE');
      expect(sqlOf(0).sql).toContain(`to_char(f."expirationDate", 'DD/MM/YYYY') ILIKE`);
      expect(sqlOf(0).sql).toContain(`to_char(f."publishedAt", 'DD/MM/YYYY') ILIKE`);
      expect(sqlOf(0).values).toContain('2.5');
      expect(sqlOf(0).values).toContain('2,5');
    });

    it('returns the pending and in-progress counts of each food', async () => {
      prismaMock.order.groupBy.mockResolvedValue([
        { foodId: 100, statusId: ORDER_STATUS_ID[ORDER_STATUS.PENDING], _count: { _all: 2 } },
        { foodId: 100, statusId: ORDER_STATUS_ID[ORDER_STATUS.IN_PROGRESS], _count: { _all: 1 } },
      ]);

      const result = await service.listMine(20, {});

      expect(result.data[0]).toMatchObject({ pendingOrders: 2, inProgressOrders: 1 });
    });
  });
});

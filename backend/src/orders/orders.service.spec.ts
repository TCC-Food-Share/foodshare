import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  FoodRequestType,
  OrderCancelledBy,
  OrderType,
  Prisma,
} from '../../generated/prisma/client';
import { ImageStorageService } from '../files/image-storage.service';
import { FOOD_STATUS } from '../foods/foods.constants';
import { FoodsService } from '../foods/foods.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OPEN_ORDER_STATUSES, ORDER_STATUS } from './orders.constants';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const dto: CreateOrderDto = { foodId: 5, quantity: 4 };

  const foodRow = {
    id: 5,
    name: 'Arroz branco',
    quantityUnit: 'kg',
    quantity: new Prisma.Decimal(10),
    requestType: FoodRequestType.TOTAL_OR_PARTIAL,
    measurementUnit: { id: 2, abbreviation: 'kg', allowsFraction: true },
    establishmentId: 3,
  };

  const orderRow = {
    id: 50,
    quantity: new Prisma.Decimal(4),
    orderDate: new Date('2026-09-03T12:00:00.000Z'),
    status: { id: 1, name: ORDER_STATUS.PENDING },
    food: {
      id: 5,
      catalogItem: { id: 16, name: 'Arroz branco' },
      measurementUnit: { id: 2, abbreviation: 'kg' },
    },
    establishment: { id: 3, companyName: 'Good Taste Ltd' },
    beneficiaryEntity: { id: 7, companyName: 'Helping Hands' },
    cancellationReason: null,
    cancelledBy: null,
  };

  const pendingOrderRow = {
    id: 50,
    quantity: new Prisma.Decimal(4),
    statusId: 1,
    foodId: 5,
    establishmentId: 3,
    beneficiaryEntityId: 7,
    deleted: false,
  };

  const inProgressOrderRow = { ...orderRow, status: { id: 2, name: ORDER_STATUS.IN_PROGRESS } };
  const rejectedOrderRow = { ...orderRow, status: { id: 3, name: ORDER_STATUS.REJECTED } };
  const donatedOrderRow = { ...orderRow, status: { id: 4, name: ORDER_STATUS.DONATED } };

  const orderDetailRow = {
    id: 50,
    quantity: new Prisma.Decimal(4),
    orderDate: new Date('2026-09-03T12:00:00.000Z'),
    status: { id: 2, name: ORDER_STATUS.IN_PROGRESS },
    food: {
      id: 5,
      image: 'foods/0b5e6f6e-3c2a-4a8e-9b1f-2d3c4e5f6a7b.webp',
      quantity: new Prisma.Decimal(6),
      description: 'Pacotes de 1kg.',
      expirationDate: new Date('2026-12-31T00:00:00.000Z'),
      catalogItem: { id: 16, name: 'Arroz branco', category: { id: 1, name: 'Não Perecíveis' } },
      measurementUnit: { id: 2, abbreviation: 'kg' },
      status: { id: 1, name: FOOD_STATUS.ACTIVE },
    },
    establishment: {
      id: 3,
      companyName: 'Good Taste Ltda',
      tradeName: 'Good Taste',
      description: 'Restaurante.',
      institutionalEmail: 'contato@goodtaste.com',
      institutionalPhone: '(11) 3456-7890',
      address: {
        id: 1,
        postalCode: '16200-000',
        street: 'Rua A',
        number: '1',
        city: 'Birigui',
        state: 'SP',
      },
    },
    beneficiaryEntity: {
      id: 7,
      companyName: 'Helping Hands Ltda',
      tradeName: null,
      description: 'ONG.',
      institutionalEmail: 'contato@helpinghands.org',
      institutionalPhone: '(11) 2222-3333',
      address: {
        id: 2,
        postalCode: '16201-000',
        street: 'Rua B',
        number: '2',
        city: 'Araçatuba',
        state: 'SP',
      },
    },
    cancellationReason: null,
    cancelledBy: null,
  };

  const orderStatusByName: Record<string, { id: number; name: string }> = {
    [ORDER_STATUS.PENDING]: { id: 1, name: ORDER_STATUS.PENDING },
    [ORDER_STATUS.IN_PROGRESS]: { id: 2, name: ORDER_STATUS.IN_PROGRESS },
    [ORDER_STATUS.REJECTED]: { id: 3, name: ORDER_STATUS.REJECTED },
    [ORDER_STATUS.DONATED]: { id: 4, name: ORDER_STATUS.DONATED },
    [ORDER_STATUS.CANCELLED]: { id: 5, name: ORDER_STATUS.CANCELLED },
  };

  const foodStatusByName: Record<string, { id: number; name: string }> = {
    [FOOD_STATUS.ACTIVE]: { id: 10, name: FOOD_STATUS.ACTIVE },
    [FOOD_STATUS.RESERVED]: { id: 20, name: FOOD_STATUS.RESERVED },
    [FOOD_STATUS.INACTIVE]: { id: 30, name: FOOD_STATUS.INACTIVE },
  };

  const conflictCode = async (promise: Promise<unknown>): Promise<unknown> => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    return ((error as ConflictException).getResponse() as { code?: string }).code;
  };

  const prismaMock = {
    beneficiaryEntity: {
      findUnique: jest.fn<(args: { where: { userId: number } }) => Promise<unknown>>(),
    },
    establishment: {
      findUnique: jest.fn<(args: { where: { userId: number } }) => Promise<unknown>>(),
    },
    orderStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    cancellationReason: { findUnique: jest.fn<(args: unknown) => Promise<unknown>>() },
    order: {
      count: jest.fn<(args: unknown) => Promise<number>>(),
      create: jest.fn<(args: unknown) => Promise<unknown>>(),
      findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
      findMany: jest.fn<(args: unknown) => Promise<unknown[]>>(),
      findUniqueOrThrow: jest.fn<(args: unknown) => Promise<unknown>>(),
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
    },
    food: {
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
      findUniqueOrThrow: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    foodStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    $transaction: jest.fn<(cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
    $queryRaw: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const storageMock = {
    toUrl: (key: string | null) => (key ? `http://api.test/files/${key}` : null),
  };

  const foodsServiceMock = {
    findAvailableById: jest.fn<(id: number, client?: unknown) => Promise<unknown>>(),
  };

  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.beneficiaryEntity.findUnique.mockResolvedValue({ id: 7, userId: 20 });
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 3, userId: 30 });
    prismaMock.orderStatus.findUniqueOrThrow.mockImplementation((args) =>
      Promise.resolve(orderStatusByName[args.where.name]),
    );
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.create.mockResolvedValue(orderRow);
    prismaMock.order.findFirst.mockResolvedValue(pendingOrderRow);
    prismaMock.order.findMany.mockResolvedValue([orderRow]);
    prismaMock.order.findUniqueOrThrow.mockResolvedValue(inProgressOrderRow);
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.food.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.food.update.mockResolvedValue({});
    prismaMock.food.findUniqueOrThrow.mockResolvedValue({
      id: 5,
      quantity: new Prisma.Decimal(2),
      deleted: false,
    });
    prismaMock.foodStatus.findUniqueOrThrow.mockImplementation((args) =>
      Promise.resolve(foodStatusByName[args.where.name]),
    );
    prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.cancellationReason.findUnique.mockResolvedValue({ id: 4, isSystem: false });
    foodsServiceMock.findAvailableById.mockResolvedValue(foodRow);

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: FoodsService, useValue: foodsServiceMock },
        { provide: ImageStorageService, useValue: storageMock },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('create', () => {
    beforeEach(() => {
      prismaMock.order.findFirst.mockResolvedValue(null);
    });

    const conflictBody = async (input: CreateOrderDto = dto): Promise<unknown> => {
      const error = await service.create(20, input).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictException);
      return (error as ConflictException).getResponse();
    };

    it('creates a "Pendente" order linked to the session entity and the food establishment', async () => {
      const result = await service.create(20, dto);

      expect(prismaMock.beneficiaryEntity.findUnique).toHaveBeenCalledWith({
        where: { userId: 20 },
      });
      expect(foodsServiceMock.findAvailableById).toHaveBeenCalledWith(5, prismaMock);
      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 4,
            foodId: 5,
            statusId: 1,
            establishmentId: 3,
            beneficiaryEntityId: 7,
          }),
        }),
      );
      expect(result.status.name).toBe(ORDER_STATUS.PENDING);
      expect(typeof result.quantity).toBe('string');
      expect(result.quantity).toBe('4');
    });

    it('throws NotFoundException when the user has no beneficiary entity', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(service.create(99, dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the food is not available', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue(null);

      await expect(service.create(20, dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    const badRequestBody = async (input: CreateOrderDto): Promise<unknown> => {
      const error = await service.create(20, input).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
      return (error as BadRequestException).getResponse();
    };

    it('throws BadRequestException when the requested quantity exceeds the food quantity', async () => {
      expect(await badRequestBody({ foodId: 5, quantity: 10.5 })).toMatchObject({
        code: 'QUANTITY_EXCEEDS_AVAILABLE',
      });
    });

    it('refuses a fraction when the unit does not allow it', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        measurementUnit: { id: 1, abbreviation: 'un', allowsFraction: false },
      });

      expect(await badRequestBody({ foodId: 5, quantity: 2.5 })).toMatchObject({
        code: 'FRACTION_NOT_ALLOWED',
      });
    });

    it('refuses part of the stock of a "Somente total" food', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        requestType: FoodRequestType.TOTAL_ONLY,
      });

      expect(await badRequestBody(dto)).toMatchObject({ code: 'TOTAL_QUANTITY_REQUIRED' });
    });

    it('refuses the whole stock of a "Somente parcial" food while a partial order is possible', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        requestType: FoodRequestType.PARTIAL_ONLY,
      });

      expect(await badRequestBody({ foodId: 5, quantity: 10 })).toMatchObject({
        code: 'PARTIAL_QUANTITY_REQUIRED',
      });
    });

    it('checks the quantity against the stock read after the lock', async () => {
      await service.create(20, dto);

      expect(foodsServiceMock.findAvailableById.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.order.create.mock.invocationCallOrder[0],
      );
    });

    it('locks the food before reading it', async () => {
      await service.create(20, dto);

      expect(prismaMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        foodsServiceMock.findAvailableById.mock.invocationCallOrder[0],
      );
    });

    it('records a TOTAL order when the quantity equals the stock', async () => {
      await service.create(20, { foodId: 5, quantity: 10 });

      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: OrderType.TOTAL }) }),
      );
    });

    it('records a PARTIAL order when the quantity is below the stock', async () => {
      await service.create(20, dto);

      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: OrderType.PARTIAL }) }),
      );
    });

    it('records a TOTAL order for a "Somente total" food', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        requestType: FoodRequestType.TOTAL_ONLY,
      });

      await service.create(20, { foodId: 5, quantity: 10 });

      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: OrderType.TOTAL }) }),
      );
    });

    it('records a PARTIAL order for the leftover of a "Somente parcial" food', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        quantity: new Prisma.Decimal(1),
        requestType: FoodRequestType.PARTIAL_ONLY,
        measurementUnit: { id: 1, abbreviation: 'un', allowsFraction: false },
      });

      await service.create(20, { foodId: 5, quantity: 1 });

      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantity: 1, type: OrderType.PARTIAL }),
        }),
      );
    });

    it('allows a quantity equal to the full food quantity', async () => {
      await service.create(20, { foodId: 5, quantity: 10 });

      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: 10 }) }),
      );
    });

    it('links the establishment from the food, not from any client input', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({ ...foodRow, establishmentId: 999 });

      await service.create(20, dto);

      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ establishmentId: 999 }) }),
      );
    });

    it('creates the order when the entity has fewer than 10 open orders', async () => {
      prismaMock.order.count.mockResolvedValue(9);

      await service.create(20, dto);

      expect(prismaMock.order.create).toHaveBeenCalled();
    });

    it('throws ConflictException with the limit code when the entity already has 10 open orders', async () => {
      prismaMock.order.count.mockResolvedValue(10);

      expect(await conflictBody()).toMatchObject({ code: 'ORDERS_IN_PROGRESS_LIMIT_REACHED' });
      expect(foodsServiceMock.findAvailableById).not.toHaveBeenCalled();
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the entity is already above the limit', async () => {
      prismaMock.order.count.mockResolvedValue(15);

      await expect(service.create(20, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it('counts open orders scoped to the entity, excluding soft-deleted and final statuses', async () => {
      await service.create(20, dto);

      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: {
          beneficiaryEntityId: 7,
          deleted: false,
          status: { name: { in: [ORDER_STATUS.PENDING, ORDER_STATUS.IN_PROGRESS] } },
        },
      });
      expect(OPEN_ORDER_STATUSES).not.toContain(ORDER_STATUS.REJECTED);
      expect(OPEN_ORDER_STATUSES).not.toContain(ORDER_STATUS.DONATED);
      expect(OPEN_ORDER_STATUSES).not.toContain(ORDER_STATUS.CANCELLED);
    });

    it('checks the limit before validating the food', async () => {
      prismaMock.order.count.mockResolvedValue(10);
      foodsServiceMock.findAvailableById.mockResolvedValue(null);

      await expect(service.create(20, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it('creates the order when the entity has no open order for the food', async () => {
      await service.create(20, dto);

      expect(prismaMock.order.findFirst).toHaveBeenCalled();
      expect(prismaMock.order.create).toHaveBeenCalled();
    });

    it('throws ConflictException with the duplicate code when the entity already has an open order for the food', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ id: 50 });

      expect(await conflictBody()).toMatchObject({ code: 'DUPLICATE_ORDER_IN_PROGRESS' });
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it('looks for the duplicate scoped to the entity and the food, excluding soft-deleted and final statuses', async () => {
      await service.create(20, dto);

      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: {
          beneficiaryEntityId: 7,
          foodId: 5,
          deleted: false,
          status: { name: { in: [ORDER_STATUS.PENDING, ORDER_STATUS.IN_PROGRESS] } },
        },
        select: { id: true },
      });
    });

    it('does not look for a duplicate when the food is not available', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue(null);

      await expect(service.create(20, dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
    });

    it('reports the limit, not the duplicate, when both apply', async () => {
      prismaMock.order.count.mockResolvedValue(10);
      prismaMock.order.findFirst.mockResolvedValue({ id: 50 });

      expect(await conflictBody()).toMatchObject({ code: 'ORDERS_IN_PROGRESS_LIMIT_REACHED' });
      expect(foodsServiceMock.findAvailableById).not.toHaveBeenCalled();
      expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
    });

    it('reports the duplicate before validating the quantity', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ id: 50 });

      expect(await conflictBody({ foodId: 5, quantity: 10.5 })).toMatchObject({
        code: 'DUPLICATE_ORDER_IN_PROGRESS',
      });
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('moves a pending order to "Em andamento" and reserves the food quantity', async () => {
      const result = await service.accept(30, 50);

      expect(prismaMock.establishment.findUnique).toHaveBeenCalledWith({ where: { userId: 30 } });
      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 50, establishmentId: 3, deleted: false },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { id: 50, statusId: 1 },
        data: { statusId: 2, acceptedAt: expect.any(Date) },
      });
      expect(prismaMock.food.updateMany).toHaveBeenCalledWith({
        where: { id: 5, quantity: { gte: pendingOrderRow.quantity } },
        data: { quantity: { decrement: pendingOrderRow.quantity } },
      });
      expect(result.status.name).toBe(ORDER_STATUS.IN_PROGRESS);
    });

    it('keeps the food "Ativo", moves pending totals to the new stock and rejects partials that no longer fit', async () => {
      await service.accept(30, 50);

      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: {
          foodId: 5,
          statusId: 1,
          deleted: false,
          type: OrderType.TOTAL,
          quantity: { not: 6 },
        },
        data: { quantity: 6, quantityUpdatedAt: expect.any(Date) },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: {
          foodId: 5,
          statusId: 1,
          deleted: false,
          type: OrderType.PARTIAL,
          quantity: { gt: 6 },
        },
        data: { statusId: 3 },
      });
    });

    it('reserves the food and rejects every other pending order when the stock reaches zero', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        quantity: new Prisma.Decimal(4),
      });

      await service.accept(30, 50);

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { statusId: 20 },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { foodId: 5, statusId: 1, deleted: false },
        data: { statusId: 3 },
      });
      expect(prismaMock.order.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: 0 }) }),
      );
    });

    it('answers ORDER_NOT_PENDING when the order is no longer pending', async () => {
      prismaMock.order.findFirst
        .mockResolvedValueOnce(pendingOrderRow)
        .mockResolvedValueOnce({ ...pendingOrderRow, statusId: 3 });

      expect(await conflictCode(service.accept(30, 50))).toBe('ORDER_NOT_PENDING');
    });

    it('answers FOOD_NOT_AVAILABLE when the food is no longer available', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue(null);

      expect(await conflictCode(service.accept(30, 50))).toBe('FOOD_NOT_AVAILABLE');
    });

    it('answers INSUFFICIENT_FOOD_QUANTITY without writing when the stock does not cover the order', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        quantity: new Prisma.Decimal(3),
      });

      expect(await conflictCode(service.accept(30, 50))).toBe('INSUFFICIENT_FOOD_QUANTITY');
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user has no establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await expect(service.accept(99, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the order is missing, deleted or from another establishment', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.accept(30, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the order is not pending', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ ...pendingOrderRow, statusId: 2 });

      await expect(service.accept(30, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
    });

    it('locks the food and rereads the order inside the transaction', async () => {
      prismaMock.order.findFirst
        .mockResolvedValueOnce(pendingOrderRow)
        .mockResolvedValueOnce({ ...pendingOrderRow, quantity: new Prisma.Decimal(3) });

      await service.accept(30, 50);

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prismaMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.order.updateMany.mock.invocationCallOrder[0],
      );
      expect(prismaMock.food.updateMany).toHaveBeenCalledWith({
        where: { id: 5, quantity: { gte: new Prisma.Decimal(3) } },
        data: { quantity: { decrement: new Prisma.Decimal(3) } },
      });
    });

    it('throws ConflictException when the order changes status before the lock is acquired', async () => {
      prismaMock.order.findFirst
        .mockResolvedValueOnce(pendingOrderRow)
        .mockResolvedValueOnce({ ...pendingOrderRow, statusId: 3 });

      await expect(service.accept(30, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the linked food is no longer available', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue(null);

      await expect(service.accept(30, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the remaining food quantity does not cover the order', async () => {
      prismaMock.food.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.accept(30, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('throws ConflictException and does not touch the food when a concurrent accept won the race', async () => {
      prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.accept(30, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('acceptImpact', () => {
    it('counts partials to reject and totals to update when stock remains, without writing', async () => {
      prismaMock.order.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const result = await service.acceptImpact(30, 50);

      expect(result).toEqual({
        pendingOrdersToReject: 2,
        totalOrdersToUpdate: 1,
        foodWillBeReserved: false,
      });
      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: {
          foodId: 5,
          statusId: 1,
          deleted: false,
          type: OrderType.PARTIAL,
          quantity: { gt: 6 },
          id: { not: 50 },
        },
      });
      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: {
          foodId: 5,
          statusId: 1,
          deleted: false,
          type: OrderType.TOTAL,
          quantity: { not: 6 },
          id: { not: 50 },
        },
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
    });

    it('counts every other pending order and reports the reservation when the stock reaches zero', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        quantity: new Prisma.Decimal(4),
      });
      prismaMock.order.count.mockResolvedValueOnce(3);

      const result = await service.acceptImpact(30, 50);

      expect(result).toEqual({
        pendingOrdersToReject: 3,
        totalOrdersToUpdate: 0,
        foodWillBeReserved: true,
      });
      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { foodId: 5, statusId: 1, deleted: false, id: { not: 50 } },
      });
    });

    it('throws NotFoundException for an order of another establishment', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.acceptImpact(30, 50)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers ORDER_NOT_PENDING for an order that is not pending', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ ...pendingOrderRow, statusId: 3 });

      expect(await conflictCode(service.acceptImpact(30, 50))).toBe('ORDER_NOT_PENDING');
    });

    it('answers INSUFFICIENT_FOOD_QUANTITY when the stock does not cover the order', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue({
        ...foodRow,
        quantity: new Prisma.Decimal(3),
      });

      expect(await conflictCode(service.acceptImpact(30, 50))).toBe('INSUFFICIENT_FOOD_QUANTITY');
    });
  });

  describe('reject', () => {
    beforeEach(() => {
      prismaMock.order.findUniqueOrThrow.mockResolvedValue(rejectedOrderRow);
    });

    it('moves a pending order to "Rejeitado" without touching the food', async () => {
      const result = await service.reject(30, 50);

      expect(prismaMock.establishment.findUnique).toHaveBeenCalledWith({ where: { userId: 30 } });
      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 50, establishmentId: 3, deleted: false },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { id: 50, statusId: 1 },
        data: { statusId: 3 },
      });
      expect(result.status.name).toBe(ORDER_STATUS.REJECTED);
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user has no establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await expect(service.reject(99, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the order is missing, deleted or from another establishment', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.reject(30, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException with ORDER_NOT_PENDING when the order is not pending', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ ...pendingOrderRow, statusId: 2 });

      expect(await conflictCode(service.reject(30, 50))).toBe('ORDER_NOT_PENDING');
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent transition won the race', async () => {
      prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reject(30, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('receive', () => {
    beforeEach(() => {
      prismaMock.order.findFirst.mockResolvedValue({ ...pendingOrderRow, statusId: 2 });
      prismaMock.order.findUniqueOrThrow.mockResolvedValue(donatedOrderRow);
    });

    it('moves an in-progress order to "Doado" under the food lock, keeping the stock', async () => {
      const result = await service.receive(20, 50);

      expect(prismaMock.beneficiaryEntity.findUnique).toHaveBeenCalledWith({
        where: { userId: 20 },
      });
      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 50, beneficiaryEntityId: 7, deleted: false },
      });
      expect(prismaMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.order.updateMany.mock.invocationCallOrder[0],
      );
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { id: 50, statusId: 2, deleted: false },
        data: { statusId: 4 },
      });
      expect(result.status.name).toBe(ORDER_STATUS.DONATED);
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
    });

    it('keeps the food when stock remains', async () => {
      await service.receive(20, 50);

      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(prismaMock.order.updateMany).toHaveBeenCalledTimes(1);
    });

    it('inactivates the food and rejects its pending orders after the last confirmation with zero stock', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue({
        id: 5,
        quantity: new Prisma.Decimal(0),
        deleted: false,
      });

      await service.receive(20, 50);

      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { foodId: 5, statusId: 2, deleted: false },
      });
      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { statusId: 30 },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { foodId: 5, statusId: 1, deleted: false },
        data: { statusId: 3 },
      });
    });

    it('keeps the food "Reservado" while another order is in progress', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue({
        id: 5,
        quantity: new Prisma.Decimal(0),
        deleted: false,
      });
      prismaMock.order.count.mockResolvedValue(1);

      await service.receive(20, 50);

      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(prismaMock.order.updateMany).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when the user has no beneficiary entity', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(service.receive(99, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the order is missing, deleted or from another entity', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.receive(20, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException with ORDER_NOT_IN_PROGRESS when the order is not in progress', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ ...pendingOrderRow, statusId: 1 });

      expect(await conflictCode(service.receive(20, 50))).toBe('ORDER_NOT_IN_PROGRESS');
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent confirmation won the race', async () => {
      prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.receive(20, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    const reason = { id: 4, name: 'Solicitação feita por engano' };
    const cancelledOrderRow = {
      ...orderRow,
      status: { id: 5, name: ORDER_STATUS.CANCELLED },
      cancellationReason: reason,
      cancelledBy: OrderCancelledBy.BENEFICIARY_ENTITY,
    };
    const foodState = (quantity: number, status: string, extra: object = {}) => ({
      id: 5,
      quantity: new Prisma.Decimal(quantity),
      deleted: false,
      status: foodStatusByName[status],
      ...extra,
    });
    // First read: the order reread after the lock. Second: the order returned to the client.
    const orderAfterLock = (statusId: number) =>
      prismaMock.order.findUniqueOrThrow
        .mockResolvedValueOnce({ ...pendingOrderRow, statusId })
        .mockResolvedValueOnce(cancelledOrderRow);
    const asEntity = () => prismaMock.establishment.findUnique.mockResolvedValue(null);
    const badRequestCode = async (promise: Promise<unknown>): Promise<unknown> => {
      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      return ((error as BadRequestException).getResponse() as { code?: string }).code;
    };
    const expectNothingChanged = () => {
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.food.update).not.toHaveBeenCalled();
    };

    beforeEach(() => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue(foodState(6, FOOD_STATUS.ACTIVE));
    });

    it.each([
      ['entity', 'pending', 1, OrderCancelledBy.BENEFICIARY_ENTITY, { beneficiaryEntityId: 7 }],
      ['entity', 'in progress', 2, OrderCancelledBy.BENEFICIARY_ENTITY, { beneficiaryEntityId: 7 }],
      ['establishment', 'pending', 1, OrderCancelledBy.ESTABLISHMENT, { establishmentId: 3 }],
      ['establishment', 'in progress', 2, OrderCancelledBy.ESTABLISHMENT, { establishmentId: 3 }],
    ])(
      'lets the %s cancel a %s order, recording the reason and the canceller',
      async (party, _status, statusId, cancelledBy, owner) => {
        if (party === 'entity') asEntity();
        orderAfterLock(statusId);

        const result = await service.cancel(20, 50, { cancellationReasonId: 4 });

        expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
          where: { id: 50, deleted: false, ...owner },
        });
        expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
          where: { id: 50, statusId, deleted: false },
          data: { statusId: 5, cancellationReasonId: 4, cancelledBy },
        });
        expect(result.cancellationReason).toEqual(reason);
        expect(result.status.name).toBe(ORDER_STATUS.CANCELLED);
      },
    );

    it('validates the reason, then locks the food before rereading the order', async () => {
      orderAfterLock(1);

      await service.cancel(20, 50, { cancellationReasonId: 4 });

      const lockCall = prismaMock.$queryRaw.mock.invocationCallOrder[0];
      expect(prismaMock.cancellationReason.findUnique.mock.invocationCallOrder[0]).toBeLessThan(
        lockCall,
      );
      expect(lockCall).toBeLessThan(prismaMock.order.findUniqueOrThrow.mock.invocationCallOrder[0]);
    });

    it('keeps the food and the other orders when the order was pending', async () => {
      orderAfterLock(1);

      await service.cancel(20, 50, { cancellationReasonId: 4 });

      expect(prismaMock.food.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(prismaMock.order.updateMany).toHaveBeenCalledTimes(1);
    });

    it('gives the quantity back to an active food when the order was in progress', async () => {
      orderAfterLock(2);

      await service.cancel(20, 50, { cancellationReasonId: 4 });

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { quantity: { increment: new Prisma.Decimal(4) } },
      });
    });

    it('moves a reserved food back to "Ativo"', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue(foodState(0, FOOD_STATUS.RESERVED));
      orderAfterLock(2);

      await service.cancel(20, 50, { cancellationReasonId: 4 });

      expect(prismaMock.food.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { quantity: { increment: new Prisma.Decimal(4) }, statusId: 10 },
      });
    });

    it('moves an expired reserved food back to "Ativo" as well', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue(
        foodState(0, FOOD_STATUS.RESERVED, { expirationDate: new Date('2020-01-01') }),
      );
      orderAfterLock(2);

      await service.cancel(20, 50, { cancellationReasonId: 4 });

      expect(prismaMock.food.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statusId: 10 }) }),
      );
    });

    it('does not give stock back to a deleted food', async () => {
      prismaMock.food.findUniqueOrThrow.mockResolvedValue(
        foodState(0, FOOD_STATUS.RESERVED, { deleted: true }),
      );
      orderAfterLock(2);

      await service.cancel(20, 50, { cancellationReasonId: 4 });

      expect(prismaMock.food.update).not.toHaveBeenCalled();
      expect(prismaMock.order.updateMany).toHaveBeenCalledTimes(1);
    });

    it('makes pending total orders follow the returned stock and leaves partial ones (DT32)', async () => {
      orderAfterLock(2);

      await service.cancel(20, 50, { cancellationReasonId: 4 });

      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: {
          foodId: 5,
          statusId: 1,
          deleted: false,
          type: OrderType.TOTAL,
          quantity: { not: 10 },
        },
        data: { quantity: 10, quantityUpdatedAt: expect.any(Date) },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: {
          foodId: 5,
          statusId: 1,
          deleted: false,
          type: OrderType.PARTIAL,
          quantity: { gt: 10 },
        },
        data: { statusId: 3 },
      });
    });

    it('requires a reason', async () => {
      expect(await badRequestCode(service.cancel(20, 50, {}))).toBe('CANCELLATION_REASON_REQUIRED');
      expectNothingChanged();
    });

    it.each([
      ['missing', null],
      ['a system reason', { id: 4, isSystem: true }],
    ])('refuses a reason that is %s', async (_name, row) => {
      prismaMock.cancellationReason.findUnique.mockResolvedValue(row);

      expect(await badRequestCode(service.cancel(20, 50, { cancellationReasonId: 4 }))).toBe(
        'INVALID_CANCELLATION_REASON',
      );
      expectNothingChanged();
    });

    it.each([
      ['Rejeitado', 3],
      ['Doado', 4],
      ['Cancelado', 5],
    ])('answers ORDER_NOT_OPEN for an order already "%s"', async (_name, statusId) => {
      prismaMock.order.findUniqueOrThrow.mockResolvedValueOnce({ ...pendingOrderRow, statusId });

      expect(await conflictCode(service.cancel(20, 50, { cancellationReasonId: 4 }))).toBe(
        'ORDER_NOT_OPEN',
      );
      expectNothingChanged();
    });

    it('answers ORDER_NOT_OPEN and gives no stock back when a concurrent transition won the race', async () => {
      orderAfterLock(2);
      prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

      expect(await conflictCode(service.cancel(20, 50, { cancellationReasonId: 4 }))).toBe(
        'ORDER_NOT_OPEN',
      );
      expect(prismaMock.food.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the order is missing, deleted or the requester is not a party', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.cancel(20, 50, { cancellationReasonId: 4 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expectNothingChanged();
    });

    it('throws NotFoundException when the account has no establishment nor beneficiary entity', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(service.cancel(99, 50, { cancellationReasonId: 4 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      prismaMock.order.count.mockResolvedValue(1);
    });

    it('lists the orders of the session establishment, newest first, no status filter', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue({ id: 99, userId: 30 });

      const result = await service.list(30, {});

      expect(prismaMock.beneficiaryEntity.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false, establishmentId: 3 },
          orderBy: { orderDate: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
      expect(result).toEqual({
        data: [expect.objectContaining({ id: 50 })],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });

    it('lists the orders of the session beneficiary entity when the account is not an establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await service.list(20, {});

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deleted: false, beneficiaryEntityId: 7 } }),
      );
    });

    it('throws NotFoundException when the account has no establishment nor beneficiary entity', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(service.list(99, {})).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.findMany).not.toHaveBeenCalled();
    });

    it('applies the status filter', async () => {
      await service.list(30, { status: ORDER_STATUS.IN_PROGRESS });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deleted: false,
            establishmentId: 3,
            status: { name: ORDER_STATUS.IN_PROGRESS },
          },
        }),
      );
    });

    it('brings the reason and the canceller of a cancelled order, and nulls for the others', async () => {
      prismaMock.order.findMany.mockResolvedValue([
        orderRow,
        {
          ...orderRow,
          id: 51,
          status: { id: 5, name: ORDER_STATUS.CANCELLED },
          cancellationReason: { id: 4, name: 'Solicitação feita por engano' },
          cancelledBy: OrderCancelledBy.BENEFICIARY_ENTITY,
        },
      ]);

      const result = await service.list(30, {});

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ cancellationReason: true }),
        }),
      );
      expect(result.data[0]).toMatchObject({ cancellationReason: null, cancelledBy: null });
      expect(result.data[1]).toMatchObject({
        cancellationReason: { id: 4, name: 'Solicitação feita por engano' },
        cancelledBy: OrderCancelledBy.BENEFICIARY_ENTITY,
      });
    });

    it('accepts "Cancelado" as a status filter', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      const result = await service.list(30, { status: ORDER_STATUS.CANCELLED });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false, establishmentId: 3, status: { name: ORDER_STATUS.CANCELLED } },
        }),
      );
      expect(result).toMatchObject({ data: [], total: 0 });
    });

    it('applies page and pageSize', async () => {
      const result = await service.list(30, { page: 2, pageSize: 20 });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
    });

    it('reports the total from order.count using the same where as findMany', async () => {
      prismaMock.order.count.mockResolvedValue(7);

      const result = await service.list(30, { status: ORDER_STATUS.DONATED });

      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { deleted: false, establishmentId: 3, status: { name: ORDER_STATUS.DONATED } },
      });
      expect(result.total).toBe(7);
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      prismaMock.order.findFirst.mockResolvedValue(orderDetailRow);
    });

    it('returns the full detail for the establishment party', async () => {
      const result = await service.getById(30, 50);

      expect(prismaMock.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 50, deleted: false, establishmentId: 3 },
        }),
      );
      expect(result.food.category).toEqual({ id: 1, name: 'Não Perecíveis' });
      expect(result.food.description).toBe('Pacotes de 1kg.');
      expect(result.food.name).toBe('Arroz branco');
      expect(result.food.quantityUnit).toBe('kg');
      expect(result.food.image).toBe(
        'http://api.test/files/foods/0b5e6f6e-3c2a-4a8e-9b1f-2d3c4e5f6a7b.webp',
      );
      expect(result.food.quantity).toBe('6');
      expect(result.quantity).toBe('4');
      expect(result.establishment).toEqual({
        id: 3,
        companyName: 'Good Taste Ltda',
        tradeName: 'Good Taste',
        description: 'Restaurante.',
        city: 'Birigui',
        state: 'SP',
      });
      expect(result.beneficiaryEntity.city).toBe('Araçatuba');
    });

    it('brings the reason and the canceller of a cancelled order', async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        ...orderDetailRow,
        status: { id: 5, name: ORDER_STATUS.CANCELLED },
        cancellationReason: { id: 2, name: 'Alimento não está mais disponível' },
        cancelledBy: OrderCancelledBy.ESTABLISHMENT,
      });

      const result = await service.getById(30, 50);

      expect(result.cancellationReason).toEqual({
        id: 2,
        name: 'Alimento não está mais disponível',
      });
      expect(result.cancelledBy).toBe(OrderCancelledBy.ESTABLISHMENT);
    });

    it('brings null reason and canceller for an order that is not cancelled', async () => {
      const result = await service.getById(30, 50);

      expect(result.cancellationReason).toBeNull();
      expect(result.cancelledBy).toBeNull();
    });

    it('resolves the beneficiary entity party when the account is not an establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await service.getById(20, 50);

      expect(prismaMock.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 50, deleted: false, beneficiaryEntityId: 7 },
        }),
      );
    });

    it('throws NotFoundException when the order is missing, deleted or the requester is not a party', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.getById(30, 50)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the account has no establishment nor beneficiary entity', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(service.getById(99, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
    });

    it('does not expose institutional contact, street address or user data of the parties', async () => {
      const result = await service.getById(30, 50);

      const keys = Object.keys(result.establishment).sort();
      expect(keys).toEqual(['city', 'companyName', 'description', 'id', 'state', 'tradeName']);
      expect(Object.keys(result.beneficiaryEntity).sort()).toEqual(keys);
    });
  });
});

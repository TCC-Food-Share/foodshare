import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { FoodsService } from '../foods/foods.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const dto: CreateOrderDto = { foodId: 5, quantity: 4 };

  const foodRow = {
    id: 5,
    name: 'Arroz branco',
    quantityUnit: 'kg',
    quantity: new Prisma.Decimal(10),
    establishmentId: 3,
  };

  const orderRow = {
    id: 50,
    quantity: new Prisma.Decimal(4),
    orderDate: new Date('2026-09-03T12:00:00.000Z'),
    status: { id: 1, name: 'Pendente' },
    food: { id: 5, name: 'Arroz branco', quantityUnit: 'kg' },
    establishment: { id: 3, companyName: 'Good Taste Ltd' },
    beneficiaryEntity: { id: 7, companyName: 'Helping Hands' },
  };

  // Pending order as returned by `order.findFirst` (no relation includes).
  const pendingOrderRow = {
    id: 50,
    quantity: new Prisma.Decimal(4),
    statusId: 1,
    foodId: 5,
    establishmentId: 3,
    beneficiaryEntityId: 7,
    deleted: false,
  };

  const acceptedOrderRow = { ...orderRow, status: { id: 2, name: 'Aceito' } };
  const rejectedOrderRow = { ...orderRow, status: { id: 3, name: 'Rejeitado' } };
  const receivedOrderRow = { ...orderRow, status: { id: 4, name: 'Recebido' } };

  const orderStatusByName: Record<string, { id: number; name: string }> = {
    Pendente: { id: 1, name: 'Pendente' },
    Aceito: { id: 2, name: 'Aceito' },
    Rejeitado: { id: 3, name: 'Rejeitado' },
    Recebido: { id: 4, name: 'Recebido' },
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
    order: {
      count: jest.fn<(args: unknown) => Promise<number>>(),
      create: jest.fn<(args: unknown) => Promise<unknown>>(),
      findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
      findUniqueOrThrow: jest.fn<(args: unknown) => Promise<unknown>>(),
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
    },
    food: {
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
    },
    $transaction: jest.fn<(cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
  };

  const foodsServiceMock = {
    findAvailableById: jest.fn<(id: number) => Promise<unknown>>(),
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
    prismaMock.order.findUniqueOrThrow.mockResolvedValue(acceptedOrderRow);
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.food.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
    foodsServiceMock.findAvailableById.mockResolvedValue(foodRow);

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: FoodsService, useValue: foodsServiceMock },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('creates a "Pendente" order linked to the session entity and the food establishment', async () => {
    const result = await service.create(20, dto);

    expect(prismaMock.beneficiaryEntity.findUnique).toHaveBeenCalledWith({ where: { userId: 20 } });
    expect(foodsServiceMock.findAvailableById).toHaveBeenCalledWith(5);
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
    expect(result.status.name).toBe('Pendente');
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

  it('throws BadRequestException when the requested quantity exceeds the food quantity', async () => {
    await expect(service.create(20, { foodId: 5, quantity: 10.5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaMock.order.create).not.toHaveBeenCalled();
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

  it('creates the order when the entity has fewer than 10 orders in progress', async () => {
    prismaMock.order.count.mockResolvedValue(9);

    await service.create(20, dto);

    expect(prismaMock.order.create).toHaveBeenCalled();
  });

  it('throws ConflictException when the entity already has 10 orders in progress', async () => {
    prismaMock.order.count.mockResolvedValue(10);

    await expect(service.create(20, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(foodsServiceMock.findAvailableById).not.toHaveBeenCalled();
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the entity is already above the limit', async () => {
    prismaMock.order.count.mockResolvedValue(15);

    await expect(service.create(20, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('counts orders in progress scoped to the entity, excluding soft-deleted and terminal statuses', async () => {
    await service.create(20, dto);

    expect(prismaMock.order.count).toHaveBeenCalledWith({
      where: {
        beneficiaryEntityId: 7,
        deleted: false,
        status: { name: { in: ['Pendente', 'Aceito'] } },
      },
    });
  });

  it('checks the limit before validating the food', async () => {
    prismaMock.order.count.mockResolvedValue(10);
    foodsServiceMock.findAvailableById.mockResolvedValue(null);

    await expect(service.create(20, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  describe('accept', () => {
    it('moves a pending order to "Aceito" and reserves the food quantity', async () => {
      const result = await service.accept(30, 50);

      expect(prismaMock.establishment.findUnique).toHaveBeenCalledWith({ where: { userId: 30 } });
      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 50, establishmentId: 3, deleted: false },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { id: 50, statusId: 1 },
        data: { statusId: 2 },
      });
      expect(prismaMock.food.updateMany).toHaveBeenCalledWith({
        where: { id: 5, quantity: { gte: pendingOrderRow.quantity } },
        data: { quantity: { decrement: pendingOrderRow.quantity } },
      });
      expect(result.status.name).toBe('Aceito');
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
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the linked food is no longer available', async () => {
      foodsServiceMock.findAvailableById.mockResolvedValue(null);

      await expect(service.accept(30, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
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
      expect(result.status.name).toBe('Rejeitado');
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

    it('throws ConflictException when the order is not pending', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ ...pendingOrderRow, statusId: 2 });

      await expect(service.reject(30, 50)).rejects.toBeInstanceOf(ConflictException);
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
      prismaMock.order.findUniqueOrThrow.mockResolvedValue(receivedOrderRow);
    });

    it('moves an accepted order to "Recebido" without touching the food', async () => {
      const result = await service.receive(20, 50);

      expect(prismaMock.beneficiaryEntity.findUnique).toHaveBeenCalledWith({
        where: { userId: 20 },
      });
      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 50, beneficiaryEntityId: 7, deleted: false },
      });
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { id: 50, statusId: 2 },
        data: { statusId: 4 },
      });
      expect(result.status.name).toBe('Recebido');
      expect(prismaMock.food.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
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

    it('throws ConflictException when the order is not accepted', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ ...pendingOrderRow, statusId: 1 });

      await expect(service.receive(20, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent confirmation won the race', async () => {
      prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.receive(20, 50)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.order.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });
});

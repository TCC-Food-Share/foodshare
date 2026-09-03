import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  const prismaMock = {
    beneficiaryEntity: {
      findUnique: jest.fn<(args: { where: { userId: number } }) => Promise<unknown>>(),
    },
    orderStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    order: {
      create: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
  };

  const foodsServiceMock = {
    findAvailableById: jest.fn<(id: number) => Promise<unknown>>(),
  };

  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.beneficiaryEntity.findUnique.mockResolvedValue({ id: 7, userId: 20 });
    prismaMock.orderStatus.findUniqueOrThrow.mockResolvedValue({ id: 1, name: 'Pendente' });
    prismaMock.order.create.mockResolvedValue(orderRow);
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
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodsService } from './foods.service';

describe('FoodsService', () => {
  const dto: CreateFoodDto = {
    image: 'https://cdn.example.com/food.jpg',
    name: 'Arroz branco',
    categoryId: 1,
    quantity: 5,
    quantityUnit: 'kg',
    description: 'Pacotes de 1kg, dentro da validade.',
    expirationDate: '2026-12-31',
  };

  const foodRow = {
    id: 100,
    image: dto.image,
    name: dto.name,
    quantity: new Prisma.Decimal(dto.quantity),
    quantityUnit: dto.quantityUnit,
    description: dto.description,
    expirationDate: new Date(dto.expirationDate),
    publishedAt: new Date('2026-08-28T12:00:00.000Z'),
    category: { id: 1, name: 'Não Perecíveis' },
    status: { id: 1, name: 'Ativo' },
    establishment: { id: 30, companyName: 'Test Establishment Ltd' },
  };

  const prismaMock = {
    establishment: {
      findUnique: jest.fn<(args: { where: { userId: number } }) => Promise<unknown>>(),
    },
    category: {
      findUnique: jest.fn<(args: { where: { id: number } }) => Promise<unknown>>(),
    },
    foodStatus: {
      findUniqueOrThrow: jest.fn<(args: { where: { name: string } }) => Promise<unknown>>(),
    },
    food: {
      create: jest.fn<(args: unknown) => Promise<unknown>>(),
      findMany: jest.fn<(args: unknown) => Promise<unknown>>(),
      count: jest.fn<(args: unknown) => Promise<number>>(),
    },
  };

  let service: FoodsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 30, userId: 20 });
    prismaMock.category.findUnique.mockResolvedValue({ id: 1, name: 'Não Perecíveis' });
    prismaMock.foodStatus.findUniqueOrThrow.mockResolvedValue({ id: 1, name: 'Ativo' });
    prismaMock.food.create.mockResolvedValue(foodRow);
    prismaMock.food.findMany.mockResolvedValue([foodRow]);
    prismaMock.food.count.mockResolvedValue(1);

    const moduleRef = await Test.createTestingModule({
      providers: [FoodsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(FoodsService);
  });

  it('creates a food for the authenticated establishment with status "Ativo"', async () => {
    const result = await service.create(20, dto);

    expect(prismaMock.establishment.findUnique).toHaveBeenCalledWith({ where: { userId: 20 } });
    expect(prismaMock.foodStatus.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { name: 'Ativo' },
    });
    expect(prismaMock.food.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ establishmentId: 30, categoryId: 1, statusId: 1 }),
      }),
    );
    expect(result.status.name).toBe('Ativo');
    expect(result.establishment.id).toBe(30);
  });

  it('sets publishedAt automatically, not from the DTO', async () => {
    await service.create(20, dto);

    expect(prismaMock.food.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ publishedAt: expect.any(Date) }) }),
    );
  });

  it('returns quantity as a string (avoids floating point precision loss)', async () => {
    const result = await service.create(20, dto);

    expect(typeof result.quantity).toBe('string');
    expect(result.quantity).toBe('5');
  });

  it('throws NotFoundException when the authenticated user has no establishment', async () => {
    prismaMock.establishment.findUnique.mockResolvedValue(null);

    await expect(service.create(999, dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.food.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when categoryId does not exist', async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);

    await expect(service.create(20, dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.food.create).not.toHaveBeenCalled();
  });

  describe('list', () => {
    it('lists the first page with defaults (page 1, size 20, newest first, available foods only)', async () => {
      const result = await service.list({});

      expect(prismaMock.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted: false,
            status: { name: 'Ativo' },
            expirationDate: { gte: expect.any(Date) },
          }),
          orderBy: { publishedAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('builds skip/take from the requested page and pageSize', async () => {
      await service.list({ page: 3, pageSize: 5 });

      expect(prismaMock.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('clamps pageSize to 50', async () => {
      const result = await service.list({ pageSize: 999 });

      expect(prismaMock.food.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
      expect(result.pageSize).toBe(50);
    });

    it('returns total from food.count using the same availability filter', async () => {
      prismaMock.food.count.mockResolvedValue(42);

      const result = await service.list({});

      expect(prismaMock.food.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deleted: false,
          status: { name: 'Ativo' },
          expirationDate: { gte: expect.any(Date) },
        }),
      });
      expect(result.total).toBe(42);
    });

    it('maps each item through the shared response shape (quantity string, relations expanded)', async () => {
      const result = await service.list({});

      expect(result.data).toHaveLength(1);
      expect(typeof result.data[0].quantity).toBe('string');
      expect(result.data[0].quantity).toBe('5');
      expect(result.data[0].category).toEqual({ id: 1, name: 'Não Perecíveis' });
      expect(result.data[0].status).toEqual({ id: 1, name: 'Ativo' });
      expect(result.data[0].establishment).toEqual({
        id: 30,
        companyName: 'Test Establishment Ltd',
      });
    });
  });
});

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

  // Literal text of every `$queryRaw` call, joined; used to tell the id query
  // from the count query and to assert which filters made it into the SQL.
  const sqlText = (sql: Prisma.Sql): string => sql.strings.join(' ');

  let idRows: { id: number }[];
  let countValue: bigint;

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
      findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    $queryRaw: jest.fn<(sql: Prisma.Sql) => Promise<unknown>>(),
  };

  const idQueryCall = (): Prisma.Sql =>
    prismaMock.$queryRaw.mock.calls.map((c) => c[0]).find((s) => !sqlText(s).includes('count(*)'))!;

  let service: FoodsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    idRows = [{ id: 100 }];
    countValue = 1n;
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 30, userId: 20 });
    prismaMock.category.findUnique.mockResolvedValue({ id: 1, name: 'Não Perecíveis' });
    prismaMock.foodStatus.findUniqueOrThrow.mockResolvedValue({ id: 1, name: 'Ativo' });
    prismaMock.food.create.mockResolvedValue(foodRow);
    prismaMock.food.findMany.mockResolvedValue([foodRow]);
    prismaMock.food.findFirst.mockResolvedValue(foodRow);
    prismaMock.$queryRaw.mockImplementation((sql: Prisma.Sql) =>
      sqlText(sql).includes('count(*)')
        ? Promise.resolve([{ count: countValue }])
        : Promise.resolve(idRows),
    );

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
    it('lists the first page with defaults (page 1, size 20) and no search clauses', async () => {
      const result = await service.list({});

      const sql = idQueryCall();
      expect(sqlText(sql)).toContain('ORDER BY f."publishedAt" DESC');
      expect(sqlText(sql)).not.toContain('unaccent');
      expect(sqlText(sql)).not.toContain('"categoryId" =');
      expect(sqlText(sql)).not.toContain('a.state =');
      // base availability params + LIMIT/OFFSET
      expect(sql.values).toEqual(['Ativo', expect.any(Date), 20, 0]);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('builds LIMIT/OFFSET from the requested page and pageSize', async () => {
      await service.list({ page: 3, pageSize: 5 });

      expect(idQueryCall().values).toEqual(['Ativo', expect.any(Date), 5, 10]);
    });

    it('clamps pageSize to 50', async () => {
      const result = await service.list({ pageSize: 999 });

      expect(idQueryCall().values).toEqual(['Ativo', expect.any(Date), 50, 0]);
      expect(result.pageSize).toBe(50);
    });

    it('passes name/categoryId/city/state filters into the where clause', async () => {
      await service.list({ name: 'feijao', categoryId: 2, city: 'birigui', state: 'SP' });

      const sql = idQueryCall();
      expect(sqlText(sql)).toContain('unaccent(f.name) ILIKE');
      expect(sqlText(sql)).toContain('f."categoryId" =');
      expect(sqlText(sql)).toContain('unaccent(a.city) ILIKE');
      expect(sqlText(sql)).toContain('a.state =');
      expect(sql.values).toEqual(['Ativo', expect.any(Date), 'feijao', 2, 'birigui', 'SP', 20, 0]);
    });

    it('hydrates by id and preserves the SQL result order', async () => {
      idRows = [{ id: 3 }, { id: 1 }, { id: 2 }];
      prismaMock.food.findMany.mockResolvedValue([
        { ...foodRow, id: 1 },
        { ...foodRow, id: 2 },
        { ...foodRow, id: 3 },
      ]);

      const result = await service.list({});

      expect(prismaMock.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: [3, 1, 2] } } }),
      );
      expect(result.data.map((food) => food.id)).toEqual([3, 1, 2]);
    });

    it('converts the bigint count to a number total', async () => {
      countValue = 42n;

      const result = await service.list({});

      expect(result.total).toBe(42);
      expect(typeof result.total).toBe('number');
    });

    it('skips hydration when no id matches (empty data, total from count)', async () => {
      idRows = [];
      countValue = 0n;

      const result = await service.list({ name: 'inexistente' });

      expect(prismaMock.food.findMany).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
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

  describe('getById', () => {
    it('queries by id within the available-food filter and maps the response', async () => {
      const result = await service.getById(100);

      expect(prismaMock.food.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 100,
            deleted: false,
            status: { name: 'Ativo' },
            expirationDate: { gte: expect.any(Date) },
          },
          include: { category: true, status: true, establishment: true },
        }),
      );
      expect(typeof result.quantity).toBe('string');
      expect(result.category).toEqual({ id: 1, name: 'Não Perecíveis' });
      expect(result.status).toEqual({ id: 1, name: 'Ativo' });
      expect(result.establishment).toEqual({ id: 30, companyName: 'Test Establishment Ltd' });
    });

    it('throws NotFoundException when no available food matches the id', async () => {
      prismaMock.food.findFirst.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAvailableById', () => {
    it('returns the raw record within the available-food filter', async () => {
      const result = await service.findAvailableById(100);

      expect(prismaMock.food.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 100,
            deleted: false,
            status: { name: 'Ativo' },
            expirationDate: { gte: expect.any(Date) },
          },
        }),
      );
      expect(result).toBe(foodRow);
    });

    it('returns null when no available food matches the id', async () => {
      prismaMock.food.findFirst.mockResolvedValue(null);

      await expect(service.findAvailableById(999)).resolves.toBeNull();
    });
  });
});

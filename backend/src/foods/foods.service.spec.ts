import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { FoodRequestType, Prisma } from '../../generated/prisma/client';
import { IMAGE_FOLDER } from '../files/files.constants';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import {
  FOOD_STATUS,
  FRACTION_NOT_ALLOWED,
  INVALID_CATALOG_ITEM,
  INVALID_MEASUREMENT_UNIT,
  PARTIAL_ONLY_QUANTITY_TOO_LOW,
} from './foods.constants';
import { FoodsService } from './foods.service';

describe('FoodsService', () => {
  const imageKey = 'foods/3f2a0c1e-9b1e-4c7a-8d2e-1f0a9b8c7d6e.webp';
  const image: ValidatedImage = { buffer: Buffer.from('img'), type: 'webp' };

  const dto: CreateFoodDto = {
    catalogItemId: 13,
    quantity: 10,
    measurementUnitId: 1,
    requestType: FoodRequestType.TOTAL_OR_PARTIAL,
    description: 'Pães do dia.',
    expirationDate: '2026-12-31',
  };

  const unitRow = { id: 1, name: 'Unidade', abbreviation: 'un', allowsFraction: false };
  const kgRow = { id: 2, name: 'Quilograma', abbreviation: 'kg', allowsFraction: true };

  const foodRow = {
    id: 100,
    image: imageKey,
    quantity: new Prisma.Decimal(5),
    requestType: FoodRequestType.TOTAL_OR_PARTIAL,
    description: 'Pães do dia.',
    notes: null,
    expirationDate: new Date('2026-12-31'),
    publishedAt: new Date('2026-08-28T12:00:00.000Z'),
    catalogItem: { id: 13, name: 'Pão francês', category: { id: 6, name: 'Pães e Massas' } },
    measurementUnit: unitRow,
    status: { id: 1, name: FOOD_STATUS.ACTIVE },
    establishment: {
      id: 30,
      companyName: 'Test Establishment Ltd',
      tradeName: 'Test',
      address: { city: 'Birigui', state: 'SP' },
    },
  };

  const sqlText = (sql: Prisma.Sql): string => sql.strings.join(' ');

  let idRows: { id: number }[];
  let countValue: bigint;

  const prismaMock = {
    establishment: {
      findUnique: jest.fn<(args: { where: { userId: number } }) => Promise<unknown>>(),
    },
    foodCatalogItem: {
      findUnique: jest.fn<(args: { where: { id: number } }) => Promise<unknown>>(),
    },
    measurementUnit: {
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

  const storageMock = {
    store: jest.fn<(folder: string, image: ValidatedImage) => Promise<string>>(),
    removeQuietly: jest.fn<(key: string) => Promise<void>>(),
    toUrl: (key: string | null) => (key ? `http://api.test/files/${key}` : null),
  };

  const idQueryCall = (): Prisma.Sql =>
    prismaMock.$queryRaw.mock.calls.map((c) => c[0]).find((s) => !sqlText(s).includes('count(*)'))!;

  const badRequestCode = async (input: CreateFoodDto): Promise<unknown> => {
    const error = await service.create(20, input, image).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    return ((error as BadRequestException).getResponse() as { code: string }).code;
  };

  let service: FoodsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    idRows = [{ id: 100 }];
    countValue = 1n;
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 30, userId: 20 });
    prismaMock.foodCatalogItem.findUnique.mockResolvedValue({ id: 13, name: 'Pão francês' });
    prismaMock.measurementUnit.findUnique.mockResolvedValue(unitRow);
    prismaMock.foodStatus.findUniqueOrThrow.mockResolvedValue({ id: 1, name: FOOD_STATUS.ACTIVE });
    prismaMock.food.create.mockResolvedValue(foodRow);
    prismaMock.food.findMany.mockResolvedValue([foodRow]);
    prismaMock.food.findFirst.mockResolvedValue(foodRow);
    prismaMock.$queryRaw.mockImplementation((sql: Prisma.Sql) =>
      sqlText(sql).includes('count(*)')
        ? Promise.resolve([{ count: countValue }])
        : Promise.resolve(idRows),
    );
    storageMock.store.mockResolvedValue(imageKey);
    storageMock.removeQuietly.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        FoodsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ImageStorageService, useValue: storageMock },
      ],
    }).compile();

    service = moduleRef.get(FoodsService);
  });

  describe('create', () => {
    it('creates an "Ativo" food from the catalog item and unit, with the image in "foods"', async () => {
      const result = await service.create(20, dto, image);

      expect(storageMock.store).toHaveBeenCalledWith(IMAGE_FOLDER.FOODS, image);
      expect(prismaMock.food.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            image: imageKey,
            catalogItemId: 13,
            measurementUnitId: 1,
            requestType: FoodRequestType.TOTAL_OR_PARTIAL,
            notes: null,
            establishmentId: 30,
            statusId: 1,
            publishedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.name).toBe('Pão francês');
      expect(result.category).toEqual({ id: 6, name: 'Pães e Massas' });
      expect(result.measurementUnit).toEqual(unitRow);
      expect(result.image).toBe(`http://api.test/files/${imageKey}`);
      expect(result.quantity).toBe('5');
      expect(result.status.name).toBe(FOOD_STATUS.ACTIVE);
    });

    it('stores the notes when present', async () => {
      await service.create(20, { ...dto, notes: 'Retirar até as 18h.' }, image);

      expect(prismaMock.food.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: 'Retirar até as 18h.' }),
        }),
      );
    });

    it('throws NotFoundException when the authenticated user has no establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await expect(service.create(999, dto, image)).rejects.toBeInstanceOf(NotFoundException);
      expect(storageMock.store).not.toHaveBeenCalled();
    });

    it('rejects an unknown catalog item before storing the image', async () => {
      prismaMock.foodCatalogItem.findUnique.mockResolvedValue(null);

      await expect(badRequestCode(dto)).resolves.toBe(INVALID_CATALOG_ITEM);
      expect(storageMock.store).not.toHaveBeenCalled();
    });

    it('rejects an unknown measurement unit before storing the image', async () => {
      prismaMock.measurementUnit.findUnique.mockResolvedValue(null);

      await expect(badRequestCode(dto)).resolves.toBe(INVALID_MEASUREMENT_UNIT);
      expect(storageMock.store).not.toHaveBeenCalled();
    });

    it('rejects a fraction when the unit does not allow it', async () => {
      await expect(badRequestCode({ ...dto, quantity: 2.5 })).resolves.toBe(FRACTION_NOT_ALLOWED);
      expect(prismaMock.food.create).not.toHaveBeenCalled();
    });

    it('accepts a fraction when the unit allows it', async () => {
      prismaMock.measurementUnit.findUnique.mockResolvedValue(kgRow);

      await service.create(20, { ...dto, quantity: 2.5, measurementUnitId: 2 }, image);

      expect(prismaMock.food.create).toHaveBeenCalled();
    });

    it('rejects partial-only when no partial order is possible', async () => {
      await expect(
        badRequestCode({ ...dto, quantity: 1, requestType: FoodRequestType.PARTIAL_ONLY }),
      ).resolves.toBe(PARTIAL_ONLY_QUANTITY_TOO_LOW);
    });

    it('removes the stored image when the insert fails', async () => {
      prismaMock.food.create.mockRejectedValue(new Error('db down'));

      await expect(service.create(20, dto, image)).rejects.toThrow('db down');
      expect(storageMock.removeQuietly).toHaveBeenCalledWith(imageKey);
    });
  });

  describe('list', () => {
    it('lists the first page with defaults (page 1, size 20) and no search clauses', async () => {
      const result = await service.list({});

      const sql = idQueryCall();
      expect(sqlText(sql)).toContain('ORDER BY f."publishedAt" DESC');
      expect(sqlText(sql)).toContain('f.quantity > 0');
      expect(sqlText(sql)).toContain('e.deleted = false');
      expect(sqlText(sql)).toContain('JOIN food_catalog_item ci');
      expect(sqlText(sql)).not.toContain('unaccent');
      expect(sqlText(sql)).not.toContain('"categoryId" =');
      expect(sqlText(sql)).not.toContain('a.state =');
      expect(sql.values).toEqual([FOOD_STATUS.ACTIVE, expect.any(Date), 20, 0]);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('builds LIMIT/OFFSET from the requested page and pageSize', async () => {
      await service.list({ page: 3, pageSize: 5 });

      expect(idQueryCall().values).toEqual([FOOD_STATUS.ACTIVE, expect.any(Date), 5, 10]);
    });

    it('clamps pageSize to 50', async () => {
      const result = await service.list({ pageSize: 999 });

      expect(idQueryCall().values).toEqual([FOOD_STATUS.ACTIVE, expect.any(Date), 50, 0]);
      expect(result.pageSize).toBe(50);
    });

    it('passes name/categoryId/city/state filters into the where clause', async () => {
      await service.list({ name: 'pao', categoryId: 2, city: 'birigui', state: 'SP' });

      const sql = idQueryCall();
      expect(sqlText(sql)).toContain('f.quantity > 0');
      expect(sqlText(sql)).toContain('unaccent(ci.name) ILIKE');
      expect(sqlText(sql)).toContain('ci."categoryId" =');
      expect(sqlText(sql)).toContain('unaccent(a.city) ILIKE');
      expect(sqlText(sql)).toContain('a.state =');
      expect(sql.values).toEqual([
        FOOD_STATUS.ACTIVE,
        expect.any(Date),
        'pao',
        2,
        'birigui',
        'SP',
        20,
        0,
      ]);
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
      expect(result.data[0].name).toBe('Pão francês');
      expect(result.data[0].category).toEqual({ id: 6, name: 'Pães e Massas' });
      expect(result.data[0].status).toEqual({ id: 1, name: FOOD_STATUS.ACTIVE });
      expect(result.data[0].establishment).toEqual({
        id: 30,
        companyName: 'Test Establishment Ltd',
        tradeName: 'Test',
        city: 'Birigui',
        state: 'SP',
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
            status: { name: FOOD_STATUS.ACTIVE },
            expirationDate: { gte: expect.any(Date) },
            quantity: { gt: 0 },
            establishment: { deleted: false },
          },
        }),
      );
      expect(typeof result.quantity).toBe('string');
      expect(result.requestType).toBe(FoodRequestType.TOTAL_OR_PARTIAL);
      expect(result.notes).toBeNull();
      expect(result.publishedAt).toEqual(foodRow.publishedAt);
      expect(result.category).toEqual({ id: 6, name: 'Pães e Massas' });
      expect(result.status).toEqual({ id: 1, name: FOOD_STATUS.ACTIVE });
      expect(result.establishment).toEqual({
        id: 30,
        companyName: 'Test Establishment Ltd',
        tradeName: 'Test',
        city: 'Birigui',
        state: 'SP',
      });
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
            status: { name: FOOD_STATUS.ACTIVE },
            expirationDate: { gte: expect.any(Date) },
            quantity: { gt: 0 },
            establishment: { deleted: false },
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

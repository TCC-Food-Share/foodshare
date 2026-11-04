import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import type { AuditService } from '../../audit/audit.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminCancellationReasonsService } from './cancellation-reasons/admin-cancellation-reasons.service';
import { AdminCategoriesService } from './categories/admin-categories.service';
import {
  DUPLICATE_ABBREVIATION,
  DUPLICATE_NAME,
  FRACTION_IN_USE,
  OPTION_IN_USE,
  SYSTEM_REASON_PROTECTED,
} from './common/admin-list.errors';
import { AdminFoodItemsService } from './food-items/admin-food-items.service';
import { AdminMeasurementUnitsService } from './measurement-units/admin-measurement-units.service';
import { AdminProhibitedTermsService } from './prohibited-terms/admin-prohibited-terms.service';

type Fn = (...args: unknown[]) => Promise<unknown>;
const fn = () => jest.fn<Fn>();
const model = () => ({
  findMany: fn(),
  findUnique: fn(),
  create: fn(),
  update: fn(),
  delete: fn(),
});

const admin = { id: 1, name: 'Admin', email: 'admin@example.com' };

const sqlText = (args: unknown[]) => {
  const [strings, ...values] = args as [readonly string[], ...unknown[]];
  return [
    ...strings,
    ...values.map((value) => (value instanceof Prisma.Sql ? value.sql : String(value))),
  ].join(' ');
};

describe('admin list services', () => {
  const tx = {
    category: model(),
    foodCatalogItem: model(),
    measurementUnit: model(),
    cancellationReason: model(),
    prohibitedTerm: model(),
    $queryRaw: fn(),
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  } as unknown as PrismaService;
  const record = jest.fn<AuditService['record']>();
  const audit = { record } as unknown as AuditService;

  let duplicates: string[];
  let fractionalFoods: bigint;

  const conflictCode = async (promise: Promise<unknown>) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    return ((error as ConflictException).getResponse() as { code: string }).code;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    duplicates = [];
    fractionalFoods = 0n;
    record.mockResolvedValue(undefined);
    tx.$queryRaw.mockImplementation((...args: unknown[]) => {
      const text = sqlText(args);
      if (text.includes('trunc')) return Promise.resolve([{ count: fractionalFoods }]);
      const column = duplicates.find((c) => text.includes(`"${c}"`));
      return Promise.resolve(column ? [{ id: 99 }] : []);
    });
  });

  describe('categories', () => {
    const service = new AdminCategoriesService(prisma, audit);

    it('creates with the administrator and audits it', async () => {
      tx.category.create.mockResolvedValue({ id: 9, name: 'Congelados' });

      const result = await service.create(admin, { name: 'Congelados' });

      expect(tx.category.create).toHaveBeenCalledWith({
        data: { name: 'Congelados', administratorId: 1 },
      });
      expect(record).toHaveBeenCalledWith(
        tx as unknown as Prisma.TransactionClient,
        expect.objectContaining({ action: 'category.create', entityId: 9 }),
      );
      expect(result).toEqual({ id: 9, name: 'Congelados', usageCount: 0 });
    });

    it('rejects a duplicate name without writing or auditing', async () => {
      duplicates = ['name'];

      await expect(conflictCode(service.create(admin, { name: 'LATICINIOS' }))).resolves.toBe(
        DUPLICATE_NAME,
      );
      expect(tx.category.create).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('excludes the edited category from the duplicate check', async () => {
      tx.category.findUnique.mockResolvedValue({
        id: 8,
        name: 'Outros',
        _count: { catalogItems: 1 },
      });
      tx.category.update.mockResolvedValue({ id: 8, name: 'Diversos' });

      await service.update(admin, 8, { name: 'Diversos' });

      expect(tx.$queryRaw.mock.calls[0]).toContain(8);
      expect(record).toHaveBeenCalledWith(
        tx as unknown as Prisma.TransactionClient,
        expect.objectContaining({
          action: 'category.update',
          details: { before: { name: 'Outros' }, after: { name: 'Diversos' } },
        }),
      );
    });

    it('blocks deleting a category in use', async () => {
      tx.category.findUnique.mockResolvedValue({
        id: 4,
        name: 'Laticínios',
        _count: { catalogItems: 9 },
      });

      await expect(conflictCode(service.remove(admin, 4))).resolves.toBe(OPTION_IN_USE);
      expect(tx.category.delete).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown category', async () => {
      tx.category.findUnique.mockResolvedValue(null);

      await expect(service.remove(admin, 404)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists with usage count', async () => {
      tx.category.findMany.mockResolvedValue([
        { id: 1, name: 'Perecíveis', _count: { catalogItems: 3 } },
      ]);

      const result = await service.list({});

      expect(result.data).toEqual([{ id: 1, name: 'Perecíveis', usageCount: 3 }]);
    });
  });

  describe('food items', () => {
    const service = new AdminFoodItemsService(prisma, audit);

    it('rejects an unknown category', async () => {
      tx.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create(admin, { name: 'Pão integral', categoryId: 99 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks deleting an item used by foods', async () => {
      tx.foodCatalogItem.findUnique.mockResolvedValue({
        id: 1,
        name: 'Pão francês',
        category: { id: 6, name: 'Pães e Massas' },
        _count: { foods: 2 },
      });

      await expect(conflictCode(service.remove(admin, 1))).resolves.toBe(OPTION_IN_USE);
    });
  });

  describe('measurement units', () => {
    const service = new AdminMeasurementUnitsService(prisma, audit);
    const kg = {
      id: 2,
      name: 'Quilograma',
      abbreviation: 'kg',
      allowsFraction: true,
      _count: { foods: 1 },
    };

    it('reports a duplicate abbreviation', async () => {
      duplicates = ['abbreviation'];
      tx.measurementUnit.findUnique.mockResolvedValue({
        ...kg,
        id: 3,
        name: 'Grama',
        abbreviation: 'g',
      });

      await expect(
        conflictCode(
          service.update(admin, 3, { name: 'Grama', abbreviation: 'KG', allowsFraction: false }),
        ),
      ).resolves.toBe(DUPLICATE_ABBREVIATION);
    });

    it('blocks turning off fractions while a food has a fractional quantity', async () => {
      tx.measurementUnit.findUnique.mockResolvedValue(kg);
      fractionalFoods = 1n;

      await expect(
        conflictCode(
          service.update(admin, 2, {
            name: 'Quilograma',
            abbreviation: 'kg',
            allowsFraction: false,
          }),
        ),
      ).resolves.toBe(FRACTION_IN_USE);
      expect(tx.measurementUnit.update).not.toHaveBeenCalled();
    });

    it('turns off fractions when no food is fractional', async () => {
      tx.measurementUnit.findUnique.mockResolvedValue(kg);
      tx.measurementUnit.update.mockResolvedValue({ ...kg, allowsFraction: false });

      const result = await service.update(admin, 2, {
        name: 'Quilograma',
        abbreviation: 'kg',
        allowsFraction: false,
      });

      expect(result.allowsFraction).toBe(false);
    });
  });

  describe('cancellation reasons', () => {
    const service = new AdminCancellationReasonsService(prisma, audit);
    const systemReason = { id: 3, name: 'Alimento vencido', isSystem: true, _count: { orders: 0 } };

    it('protects system reasons from edits and deletion', async () => {
      tx.cancellationReason.findUnique.mockResolvedValue(systemReason);

      await expect(conflictCode(service.update(admin, 3, { name: 'Vencido' }))).resolves.toBe(
        SYSTEM_REASON_PROTECTED,
      );
      await expect(conflictCode(service.remove(admin, 3))).resolves.toBe(SYSTEM_REASON_PROTECTED);
    });

    it('creates reasons as common', async () => {
      tx.cancellationReason.create.mockResolvedValue({
        id: 8,
        name: 'Estabelecimento fechado',
        isSystem: false,
        _count: { orders: 0 },
      });

      await service.create(admin, { name: 'Estabelecimento fechado' });

      expect(tx.cancellationReason.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isSystem: false }) }),
      );
    });
  });

  describe('prohibited terms', () => {
    const service = new AdminProhibitedTermsService(prisma, audit);

    it('stores the term normalized', async () => {
      tx.prohibitedTerm.create.mockResolvedValue({ id: 15, term: 'otario' });

      await service.create(admin, { term: ' Otário ' });

      expect(tx.prohibitedTerm.create).toHaveBeenCalledWith({
        data: { term: 'otario', administratorId: 1 },
      });
    });
  });
});

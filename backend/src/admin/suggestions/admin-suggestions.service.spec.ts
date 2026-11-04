import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { SuggestionStatus, SuggestionType } from '../../../generated/prisma/client';
import { AuditService } from '../../audit/audit.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminCancellationReasonsService } from '../lists/cancellation-reasons/admin-cancellation-reasons.service';
import { AdminCategoriesService } from '../lists/categories/admin-categories.service';
import { AdminFoodItemsService } from '../lists/food-items/admin-food-items.service';
import { AdminMeasurementUnitsService } from '../lists/measurement-units/admin-measurement-units.service';
import { AdminSuggestionsService } from './admin-suggestions.service';

type Fn = (...args: unknown[]) => Promise<unknown>;
const fn = () => jest.fn<Fn>();

const admin = { id: 1, name: 'Admin', email: 'admin@example.com' };
const createdAt = new Date('2026-11-04T12:00:00.000Z');

const row = (overrides: object = {}) => ({
  id: 3,
  type: SuggestionType.CATEGORY,
  text: 'congelados',
  status: SuggestionStatus.PENDING,
  createdAt,
  reviewedAt: null,
  requester: {
    establishment: { tradeName: 'Padaria Boa', companyName: 'Padaria Boa Ltda' },
    beneficiaryEntity: null,
  },
  ...overrides,
});

describe('AdminSuggestionsService', () => {
  const tx = {
    suggestion: {
      findMany: fn(),
      findUnique: fn(),
      findUniqueOrThrow: fn(),
      updateMany: fn(),
    },
    category: { create: fn(), findUnique: fn() },
    foodCatalogItem: { create: fn() },
    measurementUnit: { create: fn() },
    cancellationReason: { create: fn() },
    auditLog: { create: fn() },
    $queryRaw: fn(),
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  } as unknown as PrismaService;
  const audit = new AuditService();
  const record = jest.spyOn(audit, 'record');
  const service = new AdminSuggestionsService(
    prisma,
    audit,
    new AdminCategoriesService(prisma, audit),
    new AdminFoodItemsService(prisma, audit),
    new AdminMeasurementUnitsService(prisma, audit),
    new AdminCancellationReasonsService(prisma, audit),
  );

  const recordedActions = () => record.mock.calls.map(([, entry]) => entry.action);
  const conflictCode = async (promise: Promise<unknown>) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    return ((error as ConflictException).getResponse() as { code: string }).code;
  };
  const useSuggestion = (type: SuggestionType, text = 'novo') => {
    tx.suggestion.findUnique.mockResolvedValue(row({ type, text }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.suggestion.findUnique.mockResolvedValue(row());
    tx.suggestion.findUniqueOrThrow.mockResolvedValue(
      row({ status: SuggestionStatus.APPROVED, reviewedAt: createdAt }),
    );
    tx.suggestion.updateMany.mockResolvedValue({ count: 1 });
    tx.$queryRaw.mockResolvedValue([]);
    tx.auditLog.create.mockResolvedValue({});
    tx.category.findUnique.mockResolvedValue({ id: 6, name: 'Pães e Massas' });
    tx.category.create.mockImplementation((args) =>
      Promise.resolve({ id: 9, name: (args as { data: { name: string } }).data.name }),
    );
    tx.foodCatalogItem.create.mockImplementation((args) => {
      const { data } = args as { data: { name: string } };
      return Promise.resolve({
        id: 9,
        name: data.name,
        category: { id: 6, name: 'Pães e Massas' },
        _count: { foods: 0 },
      });
    });
    tx.measurementUnit.create.mockImplementation((args) => {
      const { data } = args as { data: object };
      return Promise.resolve({ id: 9, ...data, _count: { foods: 0 } });
    });
    tx.cancellationReason.create.mockImplementation((args) => {
      const { data } = args as { data: object };
      return Promise.resolve({ id: 9, ...data, _count: { orders: 0 } });
    });
  });

  describe('list', () => {
    it('filters by type and status and names the institution', async () => {
      tx.suggestion.findMany.mockResolvedValue([row()]);
      const page = await service.list({
        type: SuggestionType.CATEGORY,
        status: SuggestionStatus.PENDING,
      });
      expect(tx.suggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: SuggestionType.CATEGORY, status: SuggestionStatus.PENDING },
        }),
      );
      expect(page.data[0]).toMatchObject({ id: 3, requesterName: 'Padaria Boa' });
    });

    it('falls back to the company name of an entity', async () => {
      tx.suggestion.findMany.mockResolvedValue([
        row({
          requester: {
            establishment: null,
            beneficiaryEntity: { tradeName: null, companyName: 'Associação Mãos' },
          },
        }),
      ]);
      const page = await service.list({});
      expect(page.data[0]?.requesterName).toBe('Associação Mãos');
    });

    it('searches the text and the institution name', async () => {
      tx.suggestion.findMany.mockResolvedValue([row(), row({ id: 4, text: 'bandeja' })]);
      await expect(service.list({ search: 'BANDEJA' })).resolves.toMatchObject({ total: 1 });
      await expect(service.list({ search: 'padaria' })).resolves.toMatchObject({ total: 2 });
    });
  });

  describe('approve', () => {
    it('creates a category with the adjusted text and keeps the original', async () => {
      await service.approve(admin, 3, { text: ' Congelados ' });
      expect(tx.category.create).toHaveBeenCalledWith({
        data: { name: 'Congelados', administratorId: 1 },
      });
      expect(tx.suggestion.updateMany).toHaveBeenCalledWith({
        where: { id: 3, status: SuggestionStatus.PENDING },
        data: expect.objectContaining({ status: SuggestionStatus.APPROVED, reviewerId: 1 }),
      });
      expect(JSON.stringify(tx.suggestion.updateMany.mock.calls[0])).not.toContain('text');
      expect(recordedActions()).toEqual(['category.create', 'suggestion.approve']);
    });

    it('uses the suggestion text when none is sent', async () => {
      await service.approve(admin, 3, {});
      expect(tx.category.create).toHaveBeenCalledWith({
        data: { name: 'congelados', administratorId: 1 },
      });
    });

    it('creates a catalog item in the chosen category', async () => {
      useSuggestion(SuggestionType.FOOD_CATALOG_ITEM, 'Pão de queijo');
      await service.approve(admin, 3, { categoryId: 6 });
      expect(tx.foodCatalogItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Pão de queijo', categoryId: 6, administratorId: 1 },
        }),
      );
      expect(recordedActions()).toEqual(['food_catalog_item.create', 'suggestion.approve']);
    });

    it('creates a measurement unit with abbreviation and fraction', async () => {
      useSuggestion(SuggestionType.MEASUREMENT_UNIT, 'Bandeja');
      await service.approve(admin, 3, { abbreviation: 'bdj', allowsFraction: false });
      expect(tx.measurementUnit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Bandeja',
            abbreviation: 'bdj',
            allowsFraction: false,
            administratorId: 1,
          }),
        }),
      );
    });

    it('creates a common cancellation reason', async () => {
      useSuggestion(SuggestionType.CANCELLATION_REASON, 'Veículo indisponível');
      await service.approve(admin, 3, {});
      expect(tx.cancellationReason.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Veículo indisponível', isSystem: false, administratorId: 1 },
        }),
      );
    });

    it.each([
      ['catalog item without category', SuggestionType.FOOD_CATALOG_ITEM, 'x', {}],
      ['unit without abbreviation', SuggestionType.MEASUREMENT_UNIT, 'x', { allowsFraction: true }],
      ['unit without fraction flag', SuggestionType.MEASUREMENT_UNIT, 'x', { abbreviation: 'x' }],
      ['empty adjusted text', SuggestionType.CATEGORY, 'x', { text: '  ' }],
      [
        'unit text over the list limit',
        SuggestionType.MEASUREMENT_UNIT,
        'x'.repeat(51),
        { abbreviation: 'x', allowsFraction: false },
      ],
    ])('rejects %s and keeps it pending', async (_name, type, text, dto) => {
      useSuggestion(type, text);
      await expect(service.approve(admin, 3, dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.suggestion.updateMany).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('rejects a category that does not exist', async () => {
      useSuggestion(SuggestionType.FOOD_CATALOG_ITEM);
      tx.category.findUnique.mockResolvedValue(null);
      await expect(service.approve(admin, 3, { categoryId: 99 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(record).not.toHaveBeenCalled();
    });

    it('answers DUPLICATE_NAME and audits nothing when the name exists', async () => {
      tx.$queryRaw.mockResolvedValue([{ id: 1 }]);
      await expect(conflictCode(service.approve(admin, 3, {}))).resolves.toBe('DUPLICATE_NAME');
      expect(tx.category.create).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('answers DUPLICATE_ABBREVIATION when the abbreviation exists', async () => {
      useSuggestion(SuggestionType.MEASUREMENT_UNIT, 'Bandeja');
      tx.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 1 }]);
      await expect(
        conflictCode(service.approve(admin, 3, { abbreviation: 'kg', allowsFraction: true })),
      ).resolves.toBe('DUPLICATE_ABBREVIATION');
    });

    it('answers 409 for a suggestion already reviewed', async () => {
      tx.suggestion.findUnique.mockResolvedValue(row({ status: SuggestionStatus.REJECTED }));
      await expect(conflictCode(service.approve(admin, 3, {}))).resolves.toBe(
        'SUGGESTION_ALREADY_REVIEWED',
      );
      expect(tx.category.create).not.toHaveBeenCalled();
    });

    it('answers 409 and creates nothing when another approval got there first', async () => {
      tx.suggestion.updateMany.mockResolvedValue({ count: 0 });
      await expect(conflictCode(service.approve(admin, 3, {}))).resolves.toBe(
        'SUGGESTION_ALREADY_REVIEWED',
      );
      expect(tx.category.create).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('answers 404 for a suggestion that does not exist', async () => {
      tx.suggestion.findUnique.mockResolvedValue(null);
      await expect(service.approve(admin, 3, {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reject', () => {
    it('marks it rejected, creates nothing and audits the decision', async () => {
      await service.reject(admin, 3);
      expect(tx.suggestion.updateMany).toHaveBeenCalledWith({
        where: { id: 3, status: SuggestionStatus.PENDING },
        data: expect.objectContaining({ status: SuggestionStatus.REJECTED, reviewerId: 1 }),
      });
      expect(tx.category.create).not.toHaveBeenCalled();
      expect(recordedActions()).toEqual(['suggestion.reject']);
    });

    it('answers 409 for a suggestion already reviewed', async () => {
      tx.suggestion.findUnique.mockResolvedValue(row({ status: SuggestionStatus.APPROVED }));
      await expect(conflictCode(service.reject(admin, 3))).resolves.toBe(
        'SUGGESTION_ALREADY_REVIEWED',
      );
    });

    it('answers 404 for a suggestion that does not exist', async () => {
      tx.suggestion.findUnique.mockResolvedValue(null);
      await expect(service.reject(admin, 3)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

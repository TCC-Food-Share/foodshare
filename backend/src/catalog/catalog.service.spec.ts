import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from './catalog.service';

type FindMany = (args: unknown) => Promise<unknown>;

describe('CatalogService', () => {
  const prismaMock = {
    category: { findMany: jest.fn<FindMany>() },
    foodCatalogItem: { findMany: jest.fn<FindMany>() },
    measurementUnit: { findMany: jest.fn<FindMany>() },
    cancellationReason: { findMany: jest.fn<FindMany>() },
  };

  let service: CatalogService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.category.findMany.mockResolvedValue([
      { id: 1, name: 'Perecíveis' },
      { id: 6, name: 'Pães e Massas' },
      { id: 8, name: 'Outros' },
    ]);
    prismaMock.foodCatalogItem.findMany.mockResolvedValue([
      { id: 2, name: 'Tomate', category: { id: 3, name: 'Hortifruti' } },
      { id: 1, name: 'Pão francês', category: { id: 6, name: 'Pães e Massas' } },
      { id: 3, name: 'Arroz branco', category: { id: 2, name: 'Não Perecíveis' } },
    ]);
    prismaMock.measurementUnit.findMany.mockResolvedValue([
      { id: 1, name: 'Unidade', abbreviation: 'un', allowsFraction: false },
      { id: 2, name: 'Quilograma', abbreviation: 'kg', allowsFraction: true },
    ]);
    prismaMock.cancellationReason.findMany.mockResolvedValue([
      { id: 4, name: 'Não poderei retirar no prazo' },
      { id: 7, name: 'Outro' },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [CatalogService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(CatalogService);
  });

  describe('listCategories', () => {
    it('lists all categories ordered by id when there is no search', async () => {
      const result = await service.listCategories();

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      });
      expect(result.map((category) => category.id)).toEqual([1, 6, 8]);
    });

    it('matches ignoring accents and case', async () => {
      const result = await service.listCategories('PAES');

      expect(result).toEqual([{ id: 6, name: 'Pães e Massas' }]);
    });
  });

  describe('listFoodItems', () => {
    it('orders items by name with their category', async () => {
      const result = await service.listFoodItems();

      expect(result.map((item) => item.name)).toEqual(['Arroz branco', 'Pão francês', 'Tomate']);
      expect(result[1].category).toEqual({ id: 6, name: 'Pães e Massas' });
    });

    it('finds "Pão francês" when searching "pao"', async () => {
      const result = await service.listFoodItems('pao');

      expect(result.map((item) => item.name)).toEqual(['Pão francês']);
    });
  });

  describe('listMeasurementUnits', () => {
    it('orders units by id', async () => {
      await service.listMeasurementUnits();

      expect(prismaMock.measurementUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'asc' } }),
      );
    });

    it('matches the abbreviation', async () => {
      const result = await service.listMeasurementUnits('KG');

      expect(result).toEqual([
        { id: 2, name: 'Quilograma', abbreviation: 'kg', allowsFraction: true },
      ]);
    });
  });

  describe('listCancellationReasons', () => {
    it('never queries system reasons and orders by id', async () => {
      await service.listCancellationReasons();

      expect(prismaMock.cancellationReason.findMany).toHaveBeenCalledWith({
        where: { isSystem: false },
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      });
    });

    it('returns nothing when the search only matches a system reason', async () => {
      const result = await service.listCancellationReasons('vencido');

      expect(result).toEqual([]);
    });
  });
});

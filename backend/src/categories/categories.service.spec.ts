import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const prismaMock = {
    category: {
      findMany: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
  };

  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.category.findMany.mockResolvedValue([
      { id: 1, name: 'Perecíveis' },
      { id: 2, name: 'Não Perecíveis' },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  it('lists all categories ordered by id', async () => {
    const result = await service.list();

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual([
      { id: 1, name: 'Perecíveis' },
      { id: 2, name: 'Não Perecíveis' },
    ]);
  });
});

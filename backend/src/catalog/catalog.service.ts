import { Injectable } from '@nestjs/common';

import { normalizeText } from '../common/normalize-text';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancellationReasonResponseDto,
  CategoryResponseDto,
  FoodCatalogItemResponseDto,
  MeasurementUnitResponseDto,
} from './dto/catalog-response.dto';

function matches(search: string | undefined, ...fields: string[]): boolean {
  if (search === undefined) return true;
  const term = normalizeText(search);
  return fields.some((field) => normalizeText(field).includes(term));
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(search?: string): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    return categories.filter((category) => matches(search, category.name));
  }

  async listFoodItems(search?: string): Promise<FoodCatalogItemResponseDto[]> {
    const items = await this.prisma.foodCatalogItem.findMany({
      select: { id: true, name: true, category: { select: { id: true, name: true } } },
    });
    return items
      .filter((item) => matches(search, item.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async listMeasurementUnits(search?: string): Promise<MeasurementUnitResponseDto[]> {
    const units = await this.prisma.measurementUnit.findMany({
      select: { id: true, name: true, abbreviation: true, allowsFraction: true },
      orderBy: { id: 'asc' },
    });
    return units.filter((unit) => matches(search, unit.name, unit.abbreviation));
  }

  async listCancellationReasons(search?: string): Promise<CancellationReasonResponseDto[]> {
    const reasons = await this.prisma.cancellationReason.findMany({
      where: { isSystem: false },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    return reasons.filter((reason) => matches(search, reason.name));
  }
}

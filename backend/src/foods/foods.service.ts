import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { IMAGE_FOLDER } from '../files/files.constants';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food-response.dto';
import { ListFoodsQueryDto } from './dto/list-foods-query.dto';
import { PaginatedFoodsResponseDto } from './dto/paginated-foods-response.dto';
import { checkFoodQuantity } from './food-quantity';
import { FOOD_STATUS, INVALID_CATALOG_ITEM, INVALID_MEASUREMENT_UNIT } from './foods.constants';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const FOOD_INCLUDE = {
  catalogItem: { include: { category: true } },
  measurementUnit: true,
  status: true,
  establishment: { include: { address: true } },
} as const satisfies Prisma.FoodInclude;

type FoodWithRelations = Prisma.FoodGetPayload<{ include: typeof FOOD_INCLUDE }>;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class FoodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
  ) {}

  async create(
    userId: number,
    dto: CreateFoodDto,
    image: ValidatedImage,
  ): Promise<FoodResponseDto> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    const catalogItem = await this.prisma.foodCatalogItem.findUnique({
      where: { id: dto.catalogItemId },
    });
    if (!catalogItem) {
      throw new BadRequestException({
        code: INVALID_CATALOG_ITEM,
        message: 'Food catalog item not found.',
      });
    }

    const unit = await this.prisma.measurementUnit.findUnique({
      where: { id: dto.measurementUnitId },
    });
    if (!unit) {
      throw new BadRequestException({
        code: INVALID_MEASUREMENT_UNIT,
        message: 'Measurement unit not found.',
      });
    }

    const quantityError = checkFoodQuantity(dto.quantity, unit.allowsFraction, dto.requestType);
    if (quantityError) {
      throw new BadRequestException({
        code: quantityError,
        message: 'Quantity is not valid for this unit and request type.',
      });
    }

    const status = await this.prisma.foodStatus.findUniqueOrThrow({
      where: { name: FOOD_STATUS.ACTIVE },
    });

    const imageKey = await this.storage.store(IMAGE_FOLDER.FOODS, image);

    try {
      const food = await this.prisma.food.create({
        data: {
          image: imageKey,
          quantity: dto.quantity,
          requestType: dto.requestType,
          description: dto.description,
          notes: dto.notes ?? null,
          expirationDate: new Date(dto.expirationDate),
          publishedAt: new Date(),
          catalogItemId: catalogItem.id,
          measurementUnitId: unit.id,
          establishmentId: establishment.id,
          statusId: status.id,
        },
        include: FOOD_INCLUDE,
      });
      return this.toResponse(food);
    } catch (error) {
      await this.storage.removeQuietly(imageKey);
      throw error;
    }
  }

  async list(query: ListFoodsQueryDto): Promise<PaginatedFoodsResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    // `unaccent()` has no Prisma query-builder equivalent, so the filtered page is
    // resolved via raw SQL and hydrated afterwards with a regular Prisma query.
    const from = Prisma.sql`
      FROM food f
      JOIN food_catalog_item ci ON ci.id = f."catalogItemId"
      JOIN establishment e ON e.id = f."establishmentId"
      JOIN address a ON a.id = e."addressId"
      JOIN food_status s ON s.id = f."statusId"
      WHERE ${this.buildAvailableAndFilteredWhere(query)}
    `;

    const idRows = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT f.id ${from}
      ORDER BY f."publishedAt" DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `);
    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT count(*) AS count ${from}
    `);

    const total = Number(countRows[0]?.count ?? 0);
    const ids = idRows.map((row) => row.id);
    const data = ids.length === 0 ? [] : await this.hydrate(ids);

    return { data, total, page, pageSize };
  }

  async getById(id: number): Promise<FoodResponseDto> {
    const food = await this.findAvailableById(id);
    if (!food) {
      throw new NotFoundException('Food not found.');
    }

    return this.toResponse(food);
  }

  findAvailableById(id: number): Promise<FoodWithRelations | null> {
    return this.prisma.food.findFirst({
      where: this.availableFoodWhereInput(id),
      include: FOOD_INCLUDE,
    });
  }

  // Mirrors `buildAvailableAndFilteredWhere`'s base filter (kept separate because
  // that one needs raw SQL for `unaccent`) — keep both in sync.
  private availableFoodWhereInput(id?: number): Prisma.FoodWhereInput {
    return {
      deleted: false,
      status: { name: FOOD_STATUS.ACTIVE },
      expirationDate: { gte: startOfTodayUtc() },
      quantity: { gt: 0 },
      establishment: { deleted: false },
      ...(id !== undefined ? { id } : {}),
    };
  }

  private buildAvailableAndFilteredWhere(query: ListFoodsQueryDto): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`f.deleted = false`,
      Prisma.sql`s.name = ${FOOD_STATUS.ACTIVE}`,
      Prisma.sql`f."expirationDate" >= ${startOfTodayUtc()}`,
      Prisma.sql`f.quantity > 0`,
      Prisma.sql`e.deleted = false`,
    ];

    if (query.name) {
      conditions.push(Prisma.sql`unaccent(ci.name) ILIKE '%' || unaccent(${query.name}) || '%'`);
    }
    if (query.categoryId !== undefined) {
      conditions.push(Prisma.sql`ci."categoryId" = ${query.categoryId}`);
    }
    if (query.city) {
      conditions.push(Prisma.sql`unaccent(a.city) ILIKE '%' || unaccent(${query.city}) || '%'`);
    }
    if (query.state) {
      conditions.push(Prisma.sql`a.state = ${query.state}`);
    }

    return Prisma.join(conditions, ' AND ');
  }

  private async hydrate(ids: number[]): Promise<FoodResponseDto[]> {
    const foods = await this.prisma.food.findMany({
      where: { id: { in: ids } },
      include: FOOD_INCLUDE,
    });
    const byId = new Map(foods.map((food) => [food.id, food]));

    return ids
      .map((id) => byId.get(id))
      .filter((food): food is NonNullable<typeof food> => food !== undefined)
      .map((food) => this.toResponse(food));
  }

  private toResponse(food: FoodWithRelations): FoodResponseDto {
    return {
      id: food.id,
      image: this.storage.toUrl(food.image),
      name: food.catalogItem.name,
      quantity: food.quantity.toString(),
      measurementUnit: {
        id: food.measurementUnit.id,
        name: food.measurementUnit.name,
        abbreviation: food.measurementUnit.abbreviation,
        allowsFraction: food.measurementUnit.allowsFraction,
      },
      requestType: food.requestType,
      description: food.description,
      notes: food.notes,
      expirationDate: food.expirationDate,
      publishedAt: food.publishedAt,
      category: { id: food.catalogItem.category.id, name: food.catalogItem.category.name },
      status: { id: food.status.id, name: food.status.name },
      establishment: {
        id: food.establishment.id,
        companyName: food.establishment.companyName,
        tradeName: food.establishment.tradeName,
        city: food.establishment.address.city,
        state: food.establishment.address.state,
      },
    };
  }
}

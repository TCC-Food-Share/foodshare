import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food-response.dto';
import { ListFoodsQueryDto } from './dto/list-foods-query.dto';
import { PaginatedFoodsResponseDto } from './dto/paginated-foods-response.dto';

const ACTIVE_STATUS = 'Ativo';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class FoodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateFoodDto): Promise<FoodResponseDto> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new BadRequestException('Invalid categoryId.');
    }

    const status = await this.prisma.foodStatus.findUniqueOrThrow({
      where: { name: ACTIVE_STATUS },
    });

    const food = await this.prisma.food.create({
      data: {
        image: dto.image,
        name: dto.name,
        quantity: dto.quantity,
        quantityUnit: dto.quantityUnit,
        description: dto.description,
        expirationDate: new Date(dto.expirationDate),
        publishedAt: new Date(),
        categoryId: category.id,
        establishmentId: establishment.id,
        statusId: status.id,
      },
      include: { category: true, status: true, establishment: true },
    });

    return this.toResponse(food);
  }

  async list(query: ListFoodsQueryDto): Promise<PaginatedFoodsResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    // `unaccent()` is not expressible through the Prisma query builder, so the
    // filtered page is resolved with raw SQL (ids + count), then hydrated with a
    // regular Prisma query to keep the category/status/establishment includes.
    const from = Prisma.sql`
      FROM food f
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
    const food = await this.prisma.food.findFirst({
      where: this.availableFoodWhereInput(id),
      include: { category: true, status: true, establishment: true },
    });
    if (!food) {
      throw new NotFoundException('Food not found.');
    }

    return this.toResponse(food);
  }

  // Prisma form of the "available food" rule (RF11). The RF12 listing keeps a raw
  // SQL form of the same base filter in `buildAvailableAndFilteredWhere` because
  // `unaccent` cannot go through the query builder; both must stay in sync.
  private availableFoodWhereInput(id?: number): Prisma.FoodWhereInput {
    return {
      deleted: false,
      status: { name: ACTIVE_STATUS },
      expirationDate: { gte: startOfTodayUtc() },
      ...(id !== undefined ? { id } : {}),
    };
  }

  private buildAvailableAndFilteredWhere(query: ListFoodsQueryDto): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`f.deleted = false`,
      Prisma.sql`s.name = ${ACTIVE_STATUS}`,
      Prisma.sql`f."expirationDate" >= ${startOfTodayUtc()}`,
    ];

    if (query.name) {
      conditions.push(Prisma.sql`unaccent(f.name) ILIKE '%' || unaccent(${query.name}) || '%'`);
    }
    if (query.categoryId !== undefined) {
      conditions.push(Prisma.sql`f."categoryId" = ${query.categoryId}`);
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
      include: { category: true, status: true, establishment: true },
    });
    const byId = new Map(foods.map((food) => [food.id, food]));

    return ids
      .map((id) => byId.get(id))
      .filter((food): food is NonNullable<typeof food> => food !== undefined)
      .map((food) => this.toResponse(food));
  }

  private toResponse(
    food: Prisma.FoodGetPayload<{
      include: { category: true; status: true; establishment: true };
    }>,
  ): FoodResponseDto {
    return {
      id: food.id,
      image: food.image,
      name: food.name,
      quantity: food.quantity.toString(),
      quantityUnit: food.quantityUnit,
      description: food.description,
      expirationDate: food.expirationDate,
      publishedAt: food.publishedAt,
      category: { id: food.category.id, name: food.category.name },
      status: { id: food.status.id, name: food.status.name },
      establishment: { id: food.establishment.id, companyName: food.establishment.companyName },
    };
  }
}

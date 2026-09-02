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
    const where = this.availableFoodsWhere();

    const [foods, total] = await Promise.all([
      this.prisma.food.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, status: true, establishment: true },
      }),
      this.prisma.food.count({ where }),
    ]);

    return {
      data: foods.map((food) => this.toResponse(food)),
      total,
      page,
      pageSize,
    };
  }

  private availableFoodsWhere(): Prisma.FoodWhereInput {
    return {
      deleted: false,
      status: { name: ACTIVE_STATUS },
      expirationDate: { gte: startOfTodayUtc() },
    };
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

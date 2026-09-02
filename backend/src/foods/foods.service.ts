import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food-response.dto';

const INITIAL_STATUS = 'Ativo';

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
      where: { name: INITIAL_STATUS },
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

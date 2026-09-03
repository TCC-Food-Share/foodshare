import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { FoodsService } from '../foods/foods.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';

const INITIAL_STATUS = 'Pendente';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foodsService: FoodsService,
  ) {}

  async create(userId: number, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });
    if (!beneficiaryEntity) {
      throw new NotFoundException('Beneficiary entity not found.');
    }

    const food = await this.foodsService.findAvailableById(dto.foodId);
    if (!food) {
      throw new NotFoundException('Food not found.');
    }

    if (new Prisma.Decimal(dto.quantity).greaterThan(food.quantity)) {
      throw new BadRequestException('Requested quantity exceeds the available amount.');
    }

    const status = await this.prisma.orderStatus.findUniqueOrThrow({
      where: { name: INITIAL_STATUS },
    });

    const order = await this.prisma.order.create({
      data: {
        quantity: dto.quantity,
        foodId: food.id,
        statusId: status.id,
        establishmentId: food.establishmentId,
        beneficiaryEntityId: beneficiaryEntity.id,
      },
      include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
    });

    return this.toResponse(order);
  }

  private toResponse(
    order: Prisma.OrderGetPayload<{
      include: { status: true; food: true; establishment: true; beneficiaryEntity: true };
    }>,
  ): OrderResponseDto {
    return {
      id: order.id,
      quantity: order.quantity.toString(),
      orderDate: order.orderDate,
      status: { id: order.status.id, name: order.status.name },
      food: { id: order.food.id, name: order.food.name, quantityUnit: order.food.quantityUnit },
      establishment: {
        id: order.establishment.id,
        companyName: order.establishment.companyName,
      },
      beneficiaryEntity: {
        id: order.beneficiaryEntity.id,
        companyName: order.beneficiaryEntity.companyName,
      },
    };
  }
}

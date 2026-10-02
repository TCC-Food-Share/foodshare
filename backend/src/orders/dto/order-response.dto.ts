import { ApiProperty } from '@nestjs/swagger';

class OrderStatusResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Pendente' })
  name!: string;
}

class OrderFoodSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Arroz branco' })
  name!: string;

  @ApiProperty({ example: 'kg' })
  quantityUnit!: string;
}

class OrderEstablishmentSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Good Taste Restaurant Ltd' })
  companyName!: string;
}

class OrderBeneficiaryEntitySummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Helping Hands Association' })
  companyName!: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    example: '2.50',
    description: 'Quantidade solicitada, como string (evita imprecisão de ponto flutuante)',
  })
  quantity!: string;

  @ApiProperty({ example: '2026-09-03T12:00:00.000Z' })
  orderDate!: Date;

  @ApiProperty({ type: () => OrderStatusResponseDto })
  status!: OrderStatusResponseDto;

  @ApiProperty({ type: () => OrderFoodSummaryDto })
  food!: OrderFoodSummaryDto;

  @ApiProperty({ type: () => OrderEstablishmentSummaryDto })
  establishment!: OrderEstablishmentSummaryDto;

  @ApiProperty({ type: () => OrderBeneficiaryEntitySummaryDto })
  beneficiaryEntity!: OrderBeneficiaryEntitySummaryDto;
}

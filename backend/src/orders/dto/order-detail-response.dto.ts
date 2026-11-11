import { ApiProperty } from '@nestjs/swagger';

import { OrderCancelledBy } from '../../../generated/prisma/client';
import {
  CANCELLATION_REASON_PROPERTY,
  CANCELLED_BY_PROPERTY,
  OrderCancellationReasonDto,
} from './order-cancellation.dto';

class OrderStatusDetailDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Em andamento' })
  name!: string;
}

class OrderFoodCategoryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Não Perecíveis' })
  name!: string;
}

class OrderFoodDetailDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'https://cdn.example.com/food.jpg', nullable: true })
  image!: string | null;

  @ApiProperty({ example: 'Arroz branco' })
  name!: string;

  @ApiProperty({
    example: '6.00',
    description: 'Quantidade atual do alimento, como string (evita imprecisão de ponto flutuante)',
  })
  quantity!: string;

  @ApiProperty({ example: 'kg' })
  quantityUnit!: string;

  @ApiProperty({ example: 'Pacotes de 1kg, dentro da validade, embalagem lacrada.' })
  description!: string;

  @ApiProperty({ example: '2026-12-31T00:00:00.000Z' })
  expirationDate!: Date;

  @ApiProperty({ type: () => OrderFoodCategoryDto })
  category!: OrderFoodCategoryDto;

  @ApiProperty({ type: () => OrderStatusDetailDto })
  status!: OrderStatusDetailDto;
}

class OrderAddressDto {
  @ApiProperty({ example: '16200-000' })
  postalCode!: string;

  @ApiProperty({ example: 'Rua das Flores' })
  street!: string;

  @ApiProperty({ example: '123' })
  number!: string;

  @ApiProperty({ example: 'Sala 2', nullable: true })
  complement!: string | null;

  @ApiProperty({ example: 'Birigui' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  state!: string;
}

class OrderInstitutionDetailDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Good Taste Restaurant Ltda' })
  companyName!: string;

  @ApiProperty({ example: 'Good Taste', nullable: true })
  tradeName!: string | null;

  @ApiProperty({ example: 'Restaurante de comida caseira.' })
  description!: string;

  @ApiProperty({ example: 'Birigui' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  state!: string;

  @ApiProperty({
    example: 'contato@goodtaste.com',
    nullable: true,
    description:
      'E-mail institucional. Só vem preenchido na instituição da outra parte e só enquanto o ' +
      'pedido está "Em andamento" (RN12); nos demais casos é null.',
  })
  institutionalEmail!: string | null;

  @ApiProperty({
    example: '(18) 99123-4567',
    nullable: true,
    description: 'Celular institucional, com a mesma regra de visibilidade do e-mail.',
  })
  institutionalPhone!: string | null;

  @ApiProperty({
    type: () => OrderAddressDto,
    nullable: true,
    description: 'Endereço completo, com a mesma regra de visibilidade do e-mail.',
  })
  address!: OrderAddressDto | null;
}

export class OrderDetailResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    example: '4.00',
    description: 'Quantidade solicitada no pedido, como string',
  })
  quantity!: string;

  @ApiProperty({ example: '2026-09-03T12:00:00.000Z' })
  orderDate!: Date;

  @ApiProperty({
    example: '2026-09-05T12:00:00.000Z',
    nullable: true,
    description:
      'Data em que o estabelecimento ajustou a quantidade do pedido (RN20, DT31, DT32); null se nunca foi ajustada.',
  })
  quantityUpdatedAt!: Date | null;

  @ApiProperty({ type: () => OrderStatusDetailDto })
  status!: OrderStatusDetailDto;

  @ApiProperty({ type: () => OrderFoodDetailDto })
  food!: OrderFoodDetailDto;

  @ApiProperty({ type: () => OrderInstitutionDetailDto })
  establishment!: OrderInstitutionDetailDto;

  @ApiProperty({ type: () => OrderInstitutionDetailDto })
  beneficiaryEntity!: OrderInstitutionDetailDto;

  @ApiProperty(CANCELLATION_REASON_PROPERTY)
  cancellationReason!: OrderCancellationReasonDto | null;

  @ApiProperty(CANCELLED_BY_PROPERTY)
  cancelledBy!: OrderCancelledBy | null;
}

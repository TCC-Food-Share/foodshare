import { ApiProperty } from '@nestjs/swagger';

class OrderStatusDetailDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Aceito' })
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

  @ApiProperty({ type: () => OrderStatusDetailDto })
  status!: OrderStatusDetailDto;

  @ApiProperty({ type: () => OrderFoodDetailDto })
  food!: OrderFoodDetailDto;

  @ApiProperty({ type: () => OrderInstitutionDetailDto })
  establishment!: OrderInstitutionDetailDto;

  @ApiProperty({ type: () => OrderInstitutionDetailDto })
  beneficiaryEntity!: OrderInstitutionDetailDto;
}

import { ApiProperty } from '@nestjs/swagger';

class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Não Perecíveis' })
  name!: string;
}

class FoodStatusResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ativo' })
  name!: string;
}

class EstablishmentSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Good Taste Restaurant Ltd' })
  companyName!: string;
}

export class FoodResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'https://cdn.example.com/food.jpg' })
  image!: string | null;

  @ApiProperty({ example: 'Arroz branco' })
  name!: string;

  @ApiProperty({
    example: '5.00',
    description: 'Quantidade, como string (evita imprecisão de ponto flutuante)',
  })
  quantity!: string;

  @ApiProperty({ example: 'kg' })
  quantityUnit!: string;

  @ApiProperty({ example: 'Pacotes de 1kg, dentro da validade, embalagem lacrada.' })
  description!: string;

  @ApiProperty({ example: '2026-12-31T00:00:00.000Z' })
  expirationDate!: Date;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z' })
  publishedAt!: Date;

  @ApiProperty({ type: () => CategoryResponseDto })
  category!: CategoryResponseDto;

  @ApiProperty({ type: () => FoodStatusResponseDto })
  status!: FoodStatusResponseDto;

  @ApiProperty({ type: () => EstablishmentSummaryDto })
  establishment!: EstablishmentSummaryDto;
}

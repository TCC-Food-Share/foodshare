import { ApiProperty } from '@nestjs/swagger';

import { FoodRequestType } from '../../../generated/prisma/client';

class CategoryResponseDto {
  @ApiProperty({ example: 6 })
  id!: number;

  @ApiProperty({ example: 'Pães e Massas' })
  name!: string;
}

class MeasurementUnitSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Unidade' })
  name!: string;

  @ApiProperty({ example: 'un' })
  abbreviation!: string;

  @ApiProperty({ example: false })
  allowsFraction!: boolean;
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

  @ApiProperty({ example: 'Good Taste', nullable: true, type: String })
  tradeName!: string | null;

  @ApiProperty({ example: 'Birigui' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  state!: string;
}

export class FoodResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    example: 'https://api.foodshare.com.br/files/foods/3f2a0c1e-9b1e-4c7a-8d2e-1f0a9b8c7d6e.webp',
    description: 'URL da rota de leitura da imagem',
  })
  image!: string | null;

  @ApiProperty({ example: 'Pão francês', description: 'Nome do item do catálogo' })
  name!: string;

  @ApiProperty({
    example: '10.00',
    description: 'Quantidade disponível, como string (evita imprecisão de ponto flutuante)',
  })
  quantity!: string;

  @ApiProperty({ type: () => MeasurementUnitSummaryDto })
  measurementUnit!: MeasurementUnitSummaryDto;

  @ApiProperty({ enum: FoodRequestType, example: FoodRequestType.TOTAL_OR_PARTIAL })
  requestType!: FoodRequestType;

  @ApiProperty({ example: 'Pães do dia, embalados em sacos de 10.' })
  description!: string;

  @ApiProperty({ example: 'Retirar até as 18h.', nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ example: '2026-12-31T00:00:00.000Z' })
  expirationDate!: Date;

  @ApiProperty({ example: '2026-10-26T12:00:00.000Z' })
  publishedAt!: Date;

  @ApiProperty({ type: () => CategoryResponseDto, description: 'Categoria do item do catálogo' })
  category!: CategoryResponseDto;

  @ApiProperty({ type: () => FoodStatusResponseDto })
  status!: FoodStatusResponseDto;

  @ApiProperty({ type: () => EstablishmentSummaryDto })
  establishment!: EstablishmentSummaryDto;
}

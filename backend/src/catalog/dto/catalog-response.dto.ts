import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Não Perecíveis' })
  name!: string;
}

export class FoodCatalogItemResponseDto {
  @ApiProperty({ example: 13 })
  id!: number;

  @ApiProperty({ example: 'Pão francês' })
  name!: string;

  @ApiProperty({ type: CategoryResponseDto })
  category!: CategoryResponseDto;
}

export class MeasurementUnitResponseDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Quilograma' })
  name!: string;

  @ApiProperty({ example: 'kg' })
  abbreviation!: string;

  @ApiProperty({ example: true, description: 'Se aceita quantidade com até 2 casas decimais' })
  allowsFraction!: boolean;
}

export class CancellationReasonResponseDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'Não poderei retirar no prazo' })
  name!: string;
}

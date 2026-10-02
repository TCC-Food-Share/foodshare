import { ApiProperty } from '@nestjs/swagger';

import { FoodResponseDto } from './food-response.dto';

export class PaginatedFoodsResponseDto {
  @ApiProperty({ type: () => FoodResponseDto, isArray: true })
  data!: FoodResponseDto[];

  @ApiProperty({ example: 42, description: 'Total de alimentos disponíveis' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Página retornada' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Tamanho de página aplicado' })
  pageSize!: number;
}

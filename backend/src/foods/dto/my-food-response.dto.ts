import { ApiProperty } from '@nestjs/swagger';

import { FoodResponseDto } from './food-response.dto';

export class MyFoodResponseDto extends FoodResponseDto {
  @ApiProperty({ example: 2, description: 'Pedidos "Pendente" do alimento' })
  pendingOrders!: number;

  @ApiProperty({ example: 1, description: 'Pedidos "Em andamento" do alimento' })
  inProgressOrders!: number;
}

export class PaginatedMyFoodsResponseDto {
  @ApiProperty({ type: () => MyFoodResponseDto, isArray: true })
  data!: MyFoodResponseDto[];

  @ApiProperty({ example: 42, description: 'Total de alimentos encontrados' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Página retornada' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Tamanho de página aplicado' })
  pageSize!: number;
}

export class QuantityImpactResponseDto {
  @ApiProperty({ example: 1, description: 'Pedidos totais que passam a pedir a nova quantidade' })
  totalOrdersToUpdate!: number;

  @ApiProperty({ example: 1, description: 'Pedidos parciais que serão rejeitados' })
  partialOrdersToReject!: number;
}

import { ApiProperty } from '@nestjs/swagger';

import { OrderResponseDto } from './order-response.dto';

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: () => OrderResponseDto, isArray: true })
  data!: OrderResponseDto[];

  @ApiProperty({ example: 42, description: 'Total de pedidos que atendem ao recorte e ao filtro' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Página retornada' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Tamanho de página aplicado' })
  pageSize!: number;
}

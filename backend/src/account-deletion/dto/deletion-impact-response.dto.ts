import { ApiProperty } from '@nestjs/swagger';

export class DeletionImpactResponseDto {
  @ApiProperty({ example: 2, description: 'Pedidos "Pendente" afetados pela exclusão' })
  pendingOrders!: number;

  @ApiProperty({ example: 1, description: 'Pedidos "Em andamento" que serão cancelados' })
  inProgressOrders!: number;
}

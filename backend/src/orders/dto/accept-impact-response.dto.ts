import { ApiProperty } from '@nestjs/swagger';

export class AcceptImpactResponseDto {
  @ApiProperty({
    example: 2,
    description:
      'Outros pedidos "Pendente" do alimento que serão rejeitados: os parciais que não cabem ' +
      'no novo estoque, ou todos, se o estoque zerar',
  })
  pendingOrdersToReject!: number;

  @ApiProperty({
    example: 1,
    description: 'Pedidos totais "Pendente" que passarão a pedir o novo estoque',
  })
  totalOrdersToUpdate!: number;

  @ApiProperty({
    example: false,
    description: 'Se o alimento passará a "Reservado" porque o estoque vai zerar',
  })
  foodWillBeReserved!: boolean;
}

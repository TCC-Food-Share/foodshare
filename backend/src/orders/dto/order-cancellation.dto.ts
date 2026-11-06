import { ApiProperty } from '@nestjs/swagger';

import { OrderCancelledBy } from '../../../generated/prisma/client';

export class OrderCancellationReasonDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'Solicitação feita por engano' })
  name!: string;
}

export const CANCELLATION_REASON_PROPERTY = {
  type: () => OrderCancellationReasonDto,
  nullable: true,
  description: 'Motivo do cancelamento. Preenchido só em pedido "Cancelado".',
} as const;

export const CANCELLED_BY_PROPERTY = {
  enum: OrderCancelledBy,
  enumName: 'OrderCancelledBy',
  nullable: true,
  example: OrderCancelledBy.BENEFICIARY_ENTITY,
  description: 'Quem cancelou o pedido (DT33). Preenchido só em pedido "Cancelado".',
} as const;

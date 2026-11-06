import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: 4,
    description:
      'Motivo do cancelamento, da lista de `GET /catalog/cancellation-reasons`. Obrigatório: a ' +
      'ausência responde `400` com `code: CANCELLATION_REASON_REQUIRED`.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  cancellationReasonId?: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class DeleteFoodQueryDto {
  @ApiPropertyOptional({
    example: 4,
    description: 'Motivo de cancelamento. Obrigatório se houver pedido "Em andamento"',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cancellationReasonId?: number;
}

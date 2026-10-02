import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

import { ORDER_STATUS_NAMES } from '../orders.constants';

export class ListOrdersQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número da página, começando em 1',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Itens por página. Default 20, limitado a no máximo 50',
    minimum: 1,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'Aceito',
    description: 'Filtra os pedidos por status. Ausente retorna todos os status.',
    enum: ORDER_STATUS_NAMES,
  })
  @IsOptional()
  @IsIn(ORDER_STATUS_NAMES)
  status?: string;
}

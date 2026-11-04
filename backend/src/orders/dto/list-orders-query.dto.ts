import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../../common/pagination';
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
    enum: PAGE_SIZES,
    default: DEFAULT_PAGE_SIZE,
    description: 'Itens por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES)
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'Em andamento',
    description: 'Filtra os pedidos por status. Ausente retorna todos os status.',
    enum: ORDER_STATUS_NAMES,
  })
  @IsOptional()
  @IsIn(ORDER_STATUS_NAMES)
  status?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../../common/pagination';
import { trimToUndefined } from '../../common/trim-to-undefined';
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

  @ApiPropertyOptional({
    example: 'arroz',
    description:
      'Trecho do nome do alimento ou do nome do estabelecimento (razão social ou nome ' +
      'fantasia), sem diferenciar maiúsculas nem acentos, ou da data do pedido em ' +
      'dd/mm/aaaa (fuso de Brasília)',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    example: 4,
    description:
      'Filtra pela entidade beneficiária (id), sempre dentro dos pedidos do solicitante. ' +
      'Usado no histórico do perfil público da entidade (RF12)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  beneficiaryEntityId?: number;
}

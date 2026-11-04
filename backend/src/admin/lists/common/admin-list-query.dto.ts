import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../../../common/pagination';

const trimToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export interface AdminListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function createAdminListQueryDto(sortFields: readonly string[]) {
  class AdminListQueryDto implements AdminListQuery {
    @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
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
      example: 'pao',
      description:
        'Identificador exato (se numérico) ou trecho dos campos de texto, sem diferenciar ' +
        'maiúsculas nem acentos',
      maxLength: 100,
    })
    @IsOptional()
    @Transform(trimToUndefined)
    @IsString()
    @MaxLength(100)
    search?: string;

    @ApiPropertyOptional({ enum: sortFields, description: 'Campo de ordenação (padrão: id)' })
    @IsOptional()
    @IsIn(sortFields)
    sort?: string;

    @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';
  }
  return AdminListQueryDto;
}

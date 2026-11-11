import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../../common/pagination';
import { trimToUndefined } from '../../common/trim-to-undefined';
import { FOOD_STATUS_NAMES, MY_FOODS_SORT_FIELDS, type MyFoodsSortField } from '../foods.constants';

export class ListMyFoodsQueryDto {
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
    enum: FOOD_STATUS_NAMES,
    description: 'Filtra pelo status do alimento',
  })
  @IsOptional()
  @IsIn(FOOD_STATUS_NAMES)
  status?: string;

  @ApiPropertyOptional({
    example: 'pao',
    description:
      'Trecho do nome, da categoria, da quantidade ou da descrição, sem diferenciar maiúsculas ' +
      'nem acentos, ou da data de vencimento ou de publicação em dd/mm/aaaa',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: MY_FOODS_SORT_FIELDS,
    description: 'Campo de ordenação (padrão: data de publicação, decrescente)',
  })
  @IsOptional()
  @IsIn(MY_FOODS_SORT_FIELDS)
  sort?: MyFoodsSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

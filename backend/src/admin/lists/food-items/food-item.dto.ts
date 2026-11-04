import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

import { createAdminListQueryDto } from '../common/admin-list-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const FOOD_ITEM_SORT_FIELDS = ['id', 'name', 'category', 'usageCount'] as const;

export class ListFoodItemsQueryDto extends createAdminListQueryDto(FOOD_ITEM_SORT_FIELDS) {}

export class SaveFoodItemDto {
  @ApiProperty({ example: 'Pão integral', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 6, description: 'Id da categoria' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId!: number;
}

class CategorySummaryDto {
  @ApiProperty({ example: 6 })
  id!: number;

  @ApiProperty({ example: 'Pães e Massas' })
  name!: string;
}

export class AdminFoodItemDto {
  @ApiProperty({ example: 235 })
  id!: number;

  @ApiProperty({ example: 'Pão integral' })
  name!: string;

  @ApiProperty({ type: CategorySummaryDto })
  category!: CategorySummaryDto;

  @ApiProperty({ example: 0, description: 'Alimentos que usam o item, inclusive excluídos' })
  usageCount!: number;
}

export class PaginatedAdminFoodItemsDto {
  @ApiProperty({ type: AdminFoodItemDto, isArray: true })
  data!: AdminFoodItemDto[];

  @ApiProperty({ example: 234 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}

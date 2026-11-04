import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { createAdminListQueryDto } from '../common/admin-list-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const CATEGORY_SORT_FIELDS = ['id', 'name', 'usageCount'] as const;

export class ListCategoriesQueryDto extends createAdminListQueryDto(CATEGORY_SORT_FIELDS) {}

export class SaveCategoryDto {
  @ApiProperty({ example: 'Congelados', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class AdminCategoryDto {
  @ApiProperty({ example: 9 })
  id!: number;

  @ApiProperty({ example: 'Congelados' })
  name!: string;

  @ApiProperty({ example: 0, description: 'Itens do catálogo ligados à categoria' })
  usageCount!: number;
}

export class PaginatedAdminCategoriesDto {
  @ApiProperty({ type: AdminCategoryDto, isArray: true })
  data!: AdminCategoryDto[];

  @ApiProperty({ example: 9 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}

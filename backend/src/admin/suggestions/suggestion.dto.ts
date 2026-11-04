import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

import { SuggestionStatus, SuggestionType } from '../../../generated/prisma/client';
import { createAdminListQueryDto } from '../lists/common/admin-list-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const SUGGESTION_SORT_FIELDS = [
  'id',
  'type',
  'text',
  'status',
  'requesterName',
  'createdAt',
] as const;

export class ListSuggestionsQueryDto extends createAdminListQueryDto(SUGGESTION_SORT_FIELDS) {
  @ApiPropertyOptional({ enum: SuggestionType, description: 'Filtra pelo tipo da sugestão' })
  @IsOptional()
  @IsEnum(SuggestionType)
  type?: SuggestionType;

  @ApiPropertyOptional({ enum: SuggestionStatus, description: 'Filtra pelo status da sugestão' })
  @IsOptional()
  @IsEnum(SuggestionStatus)
  status?: SuggestionStatus;
}

export class ApproveSuggestionDto {
  @ApiPropertyOptional({
    example: 'Pão de queijo',
    description: 'Texto da nova opção. Sem ele, vale o texto da sugestão',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: 6, description: 'Obrigatório para item do catálogo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @ApiPropertyOptional({ example: 'bdj', description: 'Obrigatório para unidade de medida' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  abbreviation?: string;

  @ApiPropertyOptional({ example: false, description: 'Obrigatório para unidade de medida' })
  @IsOptional()
  @IsBoolean()
  allowsFraction?: boolean;
}

export class AdminSuggestionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: SuggestionType, example: SuggestionType.FOOD_CATALOG_ITEM })
  type!: SuggestionType;

  @ApiProperty({ example: 'Pão de queijo', description: 'Texto original da sugestão' })
  text!: string;

  @ApiProperty({ enum: SuggestionStatus, example: SuggestionStatus.PENDING })
  status!: SuggestionStatus;

  @ApiProperty({
    example: 'Padaria Boa',
    description: 'Nome fantasia da instituição ou, na falta dele, a razão social',
  })
  requesterName!: string;

  @ApiProperty({ example: '2026-11-04T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: null, nullable: true, type: Date })
  reviewedAt!: Date | null;
}

export class PaginatedAdminSuggestionsDto {
  @ApiProperty({ type: AdminSuggestionDto, isArray: true })
  data!: AdminSuggestionDto[];

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;
}

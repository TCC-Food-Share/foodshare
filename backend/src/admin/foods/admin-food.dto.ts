import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

import { FoodRequestType } from '../../../generated/prisma/client';
import { trim, trimToNull } from '../../common/trim-to-null';
import { NoProhibitedContent } from '../../content-moderation/no-prohibited-content.validator';
import { FOOD_STATUS_NAMES, MAX_FOOD_QUANTITY } from '../../foods/foods.constants';
import { createAdminListQueryDto } from '../lists/common/admin-list-query.dto';

export const ADMIN_FOOD_SORT_FIELDS = [
  'name',
  'category',
  'quantity',
  'status',
  'establishment',
  'expirationDate',
  'publishedAt',
] as const;

export const ADMIN_FOOD_SITUATIONS = ['active', 'deleted'] as const;

export type AdminFoodSituation = (typeof ADMIN_FOOD_SITUATIONS)[number];

export class ListAdminFoodsQueryDto extends createAdminListQueryDto(ADMIN_FOOD_SORT_FIELDS) {
  @ApiPropertyOptional({ enum: FOOD_STATUS_NAMES, description: 'Filtra por status do alimento' })
  @IsOptional()
  @IsIn(FOOD_STATUS_NAMES)
  status?: string;

  @ApiPropertyOptional({
    enum: ADMIN_FOOD_SITUATIONS,
    description:
      'Filtra por situação: `active` (não excluídos) ou `deleted` (excluídos). Sem ' +
      'o filtro, traz os dois (DT60)',
  })
  @IsOptional()
  @IsIn(ADMIN_FOOD_SITUATIONS)
  situation?: AdminFoodSituation;
}

class AdminFoodCategoryDto {
  @ApiProperty({ example: 6 })
  id!: number;

  @ApiProperty({ example: 'Pães e Massas' })
  name!: string;
}

class AdminFoodUnitDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Quilograma' })
  name!: string;

  @ApiProperty({ example: 'kg' })
  abbreviation!: string;

  @ApiProperty({ example: true })
  allowsFraction!: boolean;
}

class AdminFoodEstablishmentDto {
  @ApiProperty({ example: 30 })
  id!: number;

  @ApiProperty({
    example: 'Padaria São José',
    description: 'Nome fantasia ou, sem ele, razão social',
  })
  publicName!: string;

  @ApiProperty({ example: 'Padaria São José Ltda' })
  companyName!: string;

  @ApiProperty({ example: false, description: 'Estabelecimento excluído logicamente (RF53)' })
  deleted!: boolean;
}

export class AdminFoodRowDto {
  @ApiProperty({ example: 100 })
  id!: number;

  @ApiProperty({
    example: 'https://api.foodshare.com.br/files/foods/3f2a.webp',
    nullable: true,
    type: String,
  })
  image!: string | null;

  @ApiProperty({ example: 'Pão francês', description: 'Nome do item do catálogo' })
  name!: string;

  @ApiProperty({ type: AdminFoodCategoryDto })
  category!: AdminFoodCategoryDto;

  @ApiProperty({ example: '10.00', description: 'Quantidade disponível, como string' })
  quantity!: string;

  @ApiProperty({ type: AdminFoodUnitDto })
  measurementUnit!: AdminFoodUnitDto;

  @ApiProperty({ enum: FoodRequestType, example: FoodRequestType.TOTAL_OR_PARTIAL })
  requestType!: FoodRequestType;

  @ApiProperty({ example: 'Ativo' })
  status!: string;

  @ApiProperty({ example: false, description: 'Alimento excluído logicamente' })
  deleted!: boolean;

  @ApiProperty({
    example: 0,
    description: 'Pedidos `Em andamento` não excluídos: com algum, a edição é recusada (DT57)',
  })
  ordersInProgress!: number;

  @ApiProperty({ type: AdminFoodEstablishmentDto })
  establishment!: AdminFoodEstablishmentDto;

  @ApiProperty({ example: '2026-12-31T00:00:00.000Z' })
  expirationDate!: Date;

  @ApiProperty({ example: '2026-10-26T12:00:00.000Z' })
  publishedAt!: Date;
}

export class PaginatedAdminFoodsDto {
  @ApiProperty({ type: [AdminFoodRowDto] })
  data!: AdminFoodRowDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;
}

export class AdminFoodOrderCountsDto {
  @ApiProperty({ example: 2 })
  pending!: number;

  @ApiProperty({ example: 0 })
  inProgress!: number;

  @ApiProperty({ example: 1 })
  rejected!: number;

  @ApiProperty({ example: 3 })
  donated!: number;

  @ApiProperty({ example: 0 })
  cancelled!: number;
}

export class AdminFoodDetailDto extends AdminFoodRowDto {
  @ApiProperty({ example: 13, description: 'Id do item do catálogo' })
  catalogItemId!: number;

  @ApiProperty({ example: 'Pães do dia, embalados em sacos de 10.' })
  description!: string;

  @ApiProperty({ example: 'Retirar até as 18h.', nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({
    type: AdminFoodOrderCountsDto,
    description: 'Pedidos do alimento por status, inclusive os excluídos logicamente',
  })
  orders!: AdminFoodOrderCountsDto;
}

const quantityProperty = {
  example: 5,
  description: 'Quantidade. Fracionada (até 2 casas) só se a unidade aceitar fração',
  maximum: MAX_FOOD_QUANTITY,
};

export class AdminFoodEditImpactQueryDto {
  @ApiPropertyOptional({ example: 13, description: 'Item do catálogo pretendido' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  catalogItemId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Unidade de medida pretendida' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  measurementUnitId?: number;

  @ApiPropertyOptional({ enum: FoodRequestType, description: 'Tipo de solicitação pretendido' })
  @IsOptional()
  @IsEnum(FoodRequestType)
  requestType?: FoodRequestType;

  @ApiPropertyOptional(quantityProperty)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_FOOD_QUANTITY)
  quantity?: number;
}

export class AdminFoodEditImpactDto {
  @ApiProperty({
    example: 1,
    description: 'Pedidos pendentes totais que passam a pedir o novo estoque',
  })
  ordersToUpdate!: number;

  @ApiProperty({ example: 2, description: 'Pedidos pendentes que serão rejeitados' })
  ordersToReject!: number;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** RF50: every field optional; only the ones sent change (multipart, so numbers come as text). */
export class AdminUpdateFoodDto extends AdminFoodEditImpactQueryDto {
  @ApiPropertyOptional({ example: 'Pães do dia, embalados em sacos de 10.', maxLength: 2000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @NoProhibitedContent()
  description?: string;

  @ApiPropertyOptional({
    example: 'Retirar até as 18h.',
    description: 'Observações. Vazio apaga o campo',
    maxLength: 2000,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(2000)
  @NoProhibitedContent()
  notes?: string | null;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Data de vencimento. Se alterada, não pode ser anterior a hoje (DT26)',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY, { message: 'expirationDate must be yyyy-mm-dd' })
  expirationDate?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description:
      'Data de publicação. Se alterada, não pode ser posterior a hoje no fuso de Brasília e é ' +
      'gravada como meia-noite de Brasília (DT57)',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY, { message: 'publishedAt must be yyyy-mm-dd' })
  publishedAt?: string;
}

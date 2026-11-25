import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../../common/pagination';
import { UpdateEstablishmentDto } from '../../establishments/dto/update-establishment.dto';
import { INSTITUTION_KINDS, type InstitutionKind } from '../../institutions/institution-kind';
import { createAdminListQueryDto } from '../lists/common/admin-list-query.dto';

export const INSTITUTION_SORT_FIELDS = [
  'type',
  'companyName',
  'tradeName',
  'cnpj',
  'responsibleName',
  'city',
  'state',
  'createdAt',
  'deleted',
] as const;

export const INSTITUTION_STATUS_FILTERS = ['active', 'deleted'] as const;

export type InstitutionStatusFilter = (typeof INSTITUTION_STATUS_FILTERS)[number];

export class ListAdminInstitutionsQueryDto extends createAdminListQueryDto(
  INSTITUTION_SORT_FIELDS,
) {
  @ApiPropertyOptional({ enum: INSTITUTION_KINDS, description: 'Filtra por tipo' })
  @IsOptional()
  @IsIn(INSTITUTION_KINDS)
  type?: InstitutionKind;

  @ApiPropertyOptional({
    enum: INSTITUTION_STATUS_FILTERS,
    description: 'Filtra por situação: `active` (não excluídas) ou `deleted` (excluídas)',
  })
  @IsOptional()
  @IsIn(INSTITUTION_STATUS_FILTERS)
  status?: InstitutionStatusFilter;
}

export class AdminPageQueryDto {
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
}

// Multipart sends every field as text.
const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class AdminUpdateInstitutionDto extends UpdateEstablishmentDto {
  @ApiPropertyOptional({
    example: true,
    description:
      '`true` numa instituição ativa aplica a exclusão lógica (RN28 ou RN29) e exige ' +
      '`cancellationReasonId` (DT49). `false` numa instituição excluída a restaura (DT50).',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  deleted?: boolean;

  @ApiPropertyOptional({
    example: 4,
    description:
      'Motivo dos pedidos cancelados pela exclusão lógica. Só junto de `deleted = true`; motivo ' +
      'de sistema é recusado.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cancellationReasonId?: number;
}

export class AdminInstitutionResponsibleDto {
  @ApiProperty({ example: 20 })
  userId!: number;

  @ApiProperty({ example: 'Maria Silva' })
  name!: string;

  @ApiProperty({ example: 'maria@example.com' })
  email!: string;

  @ApiProperty({ example: '(18) 99123-4567', nullable: true, type: String })
  personalPhone!: string | null;
}

export class AdminInstitutionRowDto {
  @ApiProperty({ enum: INSTITUTION_KINDS })
  kind!: InstitutionKind;

  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({
    example: 'https://api.foodshare.com.br/files/users/a.png',
    nullable: true,
    type: String,
  })
  image!: string | null;

  @ApiProperty({ example: 'Restaurante Bom Sabor Ltda' })
  companyName!: string;

  @ApiProperty({ example: 'Bom Sabor', nullable: true, type: String })
  tradeName!: string | null;

  @ApiProperty({ example: '12.345.678/0001-90' })
  cnpj!: string;

  @ApiProperty({ example: 'contato@bomsabor.com' })
  institutionalEmail!: string;

  @ApiProperty({ example: '(18) 3644-1234' })
  institutionalPhone!: string;

  @ApiProperty({ type: AdminInstitutionResponsibleDto })
  responsible!: AdminInstitutionResponsibleDto;

  @ApiProperty({ example: 'Birigui' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  state!: string;

  @ApiProperty({ example: '2026-11-05T13:00:00.000Z', description: 'Data de cadastro' })
  createdAt!: Date;

  @ApiProperty({ example: false })
  deleted!: boolean;

  @ApiProperty({ example: true, description: 'Se o responsável já confirmou o e-mail' })
  emailVerified!: boolean;
}

export class PaginatedAdminInstitutionsDto {
  @ApiProperty({ type: [AdminInstitutionRowDto] })
  data!: AdminInstitutionRowDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;
}

export class AdminInstitutionAddressDto {
  @ApiProperty({ example: '16200-000' })
  postalCode!: string;

  @ApiProperty({ example: 'Rua Santos Dumont' })
  street!: string;

  @ApiProperty({ example: '100' })
  number!: string;

  @ApiProperty({ example: 'Sala 2', nullable: true, type: String })
  complement!: string | null;

  @ApiProperty({ example: 'Birigui' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  state!: string;
}

export class FoodActivityDto {
  @ApiProperty({ example: 2, description: 'Alimentos "Ativo" não excluídos' })
  active!: number;

  @ApiProperty({ example: 0, description: 'Alimentos "Reservado" não excluídos' })
  reserved!: number;

  @ApiProperty({ example: 1, description: 'Alimentos "Inativo" não excluídos' })
  inactive!: number;

  @ApiProperty({ example: 1, description: 'Alimentos excluídos logicamente' })
  deleted!: number;
}

export class OrderActivityDto {
  @ApiProperty({ example: 1 })
  pending!: number;

  @ApiProperty({ example: 0 })
  inProgress!: number;

  @ApiProperty({ example: 2 })
  rejected!: number;

  @ApiProperty({ example: 3 })
  donated!: number;

  @ApiProperty({ example: 1 })
  cancelled!: number;
}

export class InstitutionActivityDto {
  @ApiProperty({
    type: FoodActivityDto,
    nullable: true,
    description: 'Só para estabelecimento; `null` para entidade.',
  })
  foods!: FoodActivityDto | null;

  @ApiProperty({
    type: OrderActivityDto,
    description: 'Pedidos recebidos (estabelecimento) ou feitos (entidade), por status',
  })
  orders!: OrderActivityDto;
}

export class AdminInstitutionProfileDto {
  @ApiProperty({ enum: INSTITUTION_KINDS })
  kind!: InstitutionKind;

  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'Restaurante Bom Sabor Ltda' })
  companyName!: string;

  @ApiProperty({ example: 'Bom Sabor', nullable: true, type: String })
  tradeName!: string | null;

  @ApiProperty({ example: '12.345.678/0001-90' })
  cnpj!: string;

  @ApiProperty({ example: 'contato@bomsabor.com' })
  institutionalEmail!: string;

  @ApiProperty({ example: '(18) 3644-1234' })
  institutionalPhone!: string;

  @ApiProperty({ example: 'Restaurante de comida caseira.' })
  description!: string;

  @ApiProperty({
    example: 'https://api.foodshare.com.br/files/users/a.png',
    nullable: true,
    type: String,
  })
  image!: string | null;

  @ApiProperty({ type: AdminInstitutionAddressDto })
  address!: AdminInstitutionAddressDto;

  @ApiProperty({ type: AdminInstitutionResponsibleDto })
  responsible!: AdminInstitutionResponsibleDto;

  @ApiProperty({ example: '2026-11-05T13:00:00.000Z', description: 'Data de cadastro' })
  createdAt!: Date;

  @ApiProperty({ example: false })
  deleted!: boolean;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiProperty({ type: InstitutionActivityDto })
  activity!: InstitutionActivityDto;
}

export class AdminInstitutionFoodDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: 'Pão francês' })
  name!: string;

  @ApiProperty({ example: 12.5 })
  quantity!: number;

  @ApiProperty({ example: 'kg' })
  unit!: string;

  @ApiProperty({ example: '2026-12-01T00:00:00.000Z' })
  expirationDate!: Date;

  @ApiProperty({ example: 'Ativo' })
  status!: string;

  @ApiProperty({ example: false })
  deleted!: boolean;
}

export class PaginatedAdminInstitutionFoodsDto {
  @ApiProperty({ type: [AdminInstitutionFoodDto] })
  data!: AdminInstitutionFoodDto[];

  @ApiProperty({ example: 15 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;
}

export class AdminInstitutionOrderDto {
  @ApiProperty({ example: 31 })
  id!: number;

  @ApiProperty({ example: 'Pão francês' })
  foodName!: string;

  @ApiProperty({
    example: 'Casa Esperança',
    description: 'Nome público da outra parte (nome fantasia ou razão social)',
  })
  counterpartName!: string;

  @ApiProperty({ example: 3 })
  quantity!: number;

  @ApiProperty({ example: 'kg' })
  unit!: string;

  @ApiProperty({ example: '2026-11-05T13:00:00.000Z' })
  orderDate!: Date;

  @ApiProperty({ example: 'Doado' })
  status!: string;

  @ApiProperty({ example: false })
  deleted!: boolean;
}

export class PaginatedAdminInstitutionOrdersDto {
  @ApiProperty({ type: [AdminInstitutionOrderDto] })
  data!: AdminInstitutionOrderDto[];

  @ApiProperty({ example: 4 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;
}

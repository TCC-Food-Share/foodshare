import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { createAdminListQueryDto } from '../common/admin-list-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const MEASUREMENT_UNIT_SORT_FIELDS = [
  'id',
  'name',
  'abbreviation',
  'allowsFraction',
  'usageCount',
] as const;

export class ListMeasurementUnitsQueryDto extends createAdminListQueryDto(
  MEASUREMENT_UNIT_SORT_FIELDS,
) {}

export class SaveMeasurementUnitDto {
  @ApiProperty({ example: 'Bandeja', maxLength: 50 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: 'bdj', maxLength: 10 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  abbreviation!: string;

  @ApiProperty({ example: false, description: 'Se aceita quantidade com até 2 casas decimais' })
  @IsBoolean()
  allowsFraction!: boolean;
}

export class AdminMeasurementUnitDto {
  @ApiProperty({ example: 9 })
  id!: number;

  @ApiProperty({ example: 'Bandeja' })
  name!: string;

  @ApiProperty({ example: 'bdj' })
  abbreviation!: string;

  @ApiProperty({ example: false })
  allowsFraction!: boolean;

  @ApiProperty({ example: 0, description: 'Alimentos que usam a unidade, inclusive excluídos' })
  usageCount!: number;
}

export class PaginatedAdminMeasurementUnitsDto {
  @ApiProperty({ type: AdminMeasurementUnitDto, isArray: true })
  data!: AdminMeasurementUnitDto[];

  @ApiProperty({ example: 8 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { createAdminListQueryDto } from '../common/admin-list-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const CANCELLATION_REASON_SORT_FIELDS = ['id', 'name', 'usageCount'] as const;

export class ListCancellationReasonsQueryDto extends createAdminListQueryDto(
  CANCELLATION_REASON_SORT_FIELDS,
) {}

export class SaveCancellationReasonDto {
  @ApiProperty({ example: 'Estabelecimento fechado', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

export class AdminCancellationReasonDto {
  @ApiProperty({ example: 8 })
  id!: number;

  @ApiProperty({ example: 'Estabelecimento fechado' })
  name!: string;

  @ApiProperty({
    example: false,
    description: 'Motivo de sistema: não pode ser editado nem excluído',
  })
  isSystem!: boolean;

  @ApiProperty({ example: 0, description: 'Pedidos cancelados com o motivo' })
  usageCount!: number;
}

export class PaginatedAdminCancellationReasonsDto {
  @ApiProperty({ type: AdminCancellationReasonDto, isArray: true })
  data!: AdminCancellationReasonDto[];

  @ApiProperty({ example: 7 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}

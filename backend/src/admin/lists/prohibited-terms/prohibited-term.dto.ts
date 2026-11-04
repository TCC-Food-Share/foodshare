import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { createAdminListQueryDto } from '../common/admin-list-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const PROHIBITED_TERM_SORT_FIELDS = ['id', 'term'] as const;

export class ListProhibitedTermsQueryDto extends createAdminListQueryDto(
  PROHIBITED_TERM_SORT_FIELDS,
) {}

export class SaveProhibitedTermDto {
  @ApiProperty({
    example: 'Otário',
    description: 'Gravado em minúsculas e sem acentos',
    maxLength: 100,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  term!: string;
}

export class AdminProhibitedTermDto {
  @ApiProperty({ example: 15 })
  id!: number;

  @ApiProperty({ example: 'otario' })
  term!: string;

  @ApiProperty({ example: 0, description: 'Sempre 0: termos proibidos não têm vínculo' })
  usageCount!: number;
}

export class PaginatedAdminProhibitedTermsDto {
  @ApiProperty({ type: AdminProhibitedTermDto, isArray: true })
  data!: AdminProhibitedTermDto[];

  @ApiProperty({ example: 14 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}

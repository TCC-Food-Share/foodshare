import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from './pagination';
import { trimToUndefined } from './trim-to-undefined';

const trimToUpperOrUndefined = ({ value }: { value: unknown }): unknown => {
  const trimmed = trimToUndefined({ value });
  return typeof trimmed === 'string' ? trimmed.toUpperCase() : trimmed;
};

export class ListInstitutionsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número da página, começando em 1',
    minimum: 1,
    default: 1,
  })
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
    example: 'padaria',
    description:
      'Busca por trecho do nome fantasia, da razão social ou da descrição, ignorando caixa e ' +
      'acento. Texto só com dígitos e pontuação de CNPJ (`.`, `/`, `-`) também casa o CNPJ, ' +
      'comparando só os dígitos',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    example: 'birigui',
    description: 'Busca por trecho do município, ignorando caixa e acento',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(200)
  city?: string;

  @ApiPropertyOptional({
    example: 'SP',
    description: 'Filtra pela UF (2 letras; normalizada para maiúsculas)',
  })
  @IsOptional()
  @Transform(trimToUpperOrUndefined)
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase state code' })
  state?: string;
}

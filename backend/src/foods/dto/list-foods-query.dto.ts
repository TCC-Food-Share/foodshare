import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const trimToUndefined = ({ value }: { value: unknown }): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const toUpperCase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.toUpperCase() : value;

export class ListFoodsQueryDto {
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
    example: 20,
    description: 'Itens por página. Default 20, limitado a no máximo 50',
    minimum: 1,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'feijão',
    description: 'Busca por trecho do nome do alimento, ignorando caixa e acento',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtra por categoria (id da lista fixa de categorias)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({
    example: 'birigui',
    description:
      'Busca por trecho do município do estabelecimento de origem, ignorando caixa e acento',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(200)
  city?: string;

  @ApiPropertyOptional({
    example: 'SP',
    description:
      'Filtra pela UF do estabelecimento de origem (2 letras; normalizada para maiúsculas)',
  })
  @IsOptional()
  @Transform(toUpperCase)
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase state code' })
  state?: string;
}

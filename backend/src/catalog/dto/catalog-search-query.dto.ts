import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trimToUndefined = ({ value }: { value: unknown }): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class CatalogSearchQueryDto {
  @ApiPropertyOptional({
    example: 'pao',
    description:
      'Filtra pelo nome, sem diferenciar maiúsculas nem acentos. Vazio ou só com espaços é ignorado',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;
}

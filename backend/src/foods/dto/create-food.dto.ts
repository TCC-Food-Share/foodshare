import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

import { FoodRequestType } from '../../../generated/prisma/client';

const trimToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class CreateFoodDto {
  @ApiProperty({ example: 13, description: 'Id do item do catálogo de alimentos' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  catalogItemId!: number;

  @ApiProperty({
    example: 5,
    description: 'Quantidade disponível. Fracionada (até 2 casas) só se a unidade aceitar fração',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 1, description: 'Id da unidade de medida' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  measurementUnitId!: number;

  @ApiProperty({
    enum: FoodRequestType,
    example: FoodRequestType.TOTAL_OR_PARTIAL,
    description: 'Tipo de solicitação aceita',
  })
  @IsEnum(FoodRequestType)
  requestType!: FoodRequestType;

  @ApiProperty({
    example: 'Pães do dia, embalados em sacos de 10.',
    description: 'Descrição do alimento',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    example: 'Retirar até as 18h.',
    description: 'Observações, opcional',
    maxLength: 2000,
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ example: '2026-12-31', description: 'Data de vencimento (ISO 8601)' })
  @IsDateString()
  expirationDate!: string;
}

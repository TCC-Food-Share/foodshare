import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, Max } from 'class-validator';

import { MAX_FOOD_QUANTITY } from '../foods.constants';

export class UpdateFoodDto {
  @ApiPropertyOptional({ example: '2026-12-31', description: 'Nova data de vencimento (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Nova quantidade. Fracionada (até 2 casas) só se a unidade aceitar fração',
    maximum: MAX_FOOD_QUANTITY,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_FOOD_QUANTITY)
  quantity?: number;
}

export class ReactivateFoodDto {
  @ApiProperty({ example: '2026-12-31', description: 'Nova data de vencimento (ISO 8601)' })
  @IsDateString()
  expirationDate!: string;

  @ApiProperty({
    example: 5,
    description: 'Nova quantidade. Fracionada (até 2 casas) só se a unidade aceitar fração',
    maximum: MAX_FOOD_QUANTITY,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_FOOD_QUANTITY)
  quantity!: number;
}

export class QuantityImpactQueryDto {
  @ApiProperty({ example: 4, description: 'Quantidade a simular', maximum: MAX_FOOD_QUANTITY })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_FOOD_QUANTITY)
  quantity!: number;
}

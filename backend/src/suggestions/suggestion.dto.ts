import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { SuggestionStatus, SuggestionType } from '../../generated/prisma/client';
import { NoProhibitedContent } from '../content-moderation/no-prohibited-content.validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSuggestionDto {
  @ApiProperty({
    enum: SuggestionType,
    example: SuggestionType.FOOD_CATALOG_ITEM,
    description: 'Lista que deve receber a nova opção',
  })
  @IsEnum(SuggestionType)
  type!: SuggestionType;

  @ApiProperty({ example: 'Pão de queijo', description: 'Texto da sugestão', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @NoProhibitedContent()
  text!: string;
}

export class SuggestionResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: SuggestionType, example: SuggestionType.FOOD_CATALOG_ITEM })
  type!: SuggestionType;

  @ApiProperty({ example: 'Pão de queijo' })
  text!: string;

  @ApiProperty({ enum: SuggestionStatus, example: SuggestionStatus.PENDING })
  status!: SuggestionStatus;

  @ApiProperty({ example: '2026-11-04T12:00:00.000Z' })
  createdAt!: Date;
}

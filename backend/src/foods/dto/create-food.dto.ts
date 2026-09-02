import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFoodDto {
  @ApiProperty({
    example: 'https://cdn.example.com/food.jpg',
    description: 'URL da imagem',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  image!: string;

  @ApiProperty({ example: 'Arroz branco', description: 'Nome do alimento', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 1, description: 'Id da categoria (lista fixa, seedada no banco)' })
  @IsInt()
  categoryId!: number;

  @ApiProperty({ example: 5, description: 'Quantidade disponível (aceita fracionário)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({
    example: 'kg',
    description: 'Unidade da quantidade (kg, unidades, litros...)',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  quantityUnit!: string;

  @ApiProperty({
    example: 'Pacotes de 1kg, dentro da validade, embalagem lacrada.',
    description: 'Descrição do alimento',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: '2026-12-31', description: 'Data de vencimento (ISO 8601)' })
  @IsDateString()
  expirationDate!: string;
}

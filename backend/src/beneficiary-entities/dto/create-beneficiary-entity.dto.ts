import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { AddressDto } from '../../establishments/dto/address.dto';

export class CreateBeneficiaryEntityDto {
  @ApiProperty({ example: 'João Souza', description: 'Nome do responsável', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'joao@example.com', description: 'E-mail pessoal do responsável' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiProperty({ example: '(11) 91234-5678', description: 'Celular pessoal do responsável' })
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'personalPhone must be a valid Brazilian phone number',
  })
  personalPhone!: string;

  @ApiProperty({
    example: 'strongPassword123',
    description: 'Senha de acesso (8 a 72 caracteres)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({
    example: 'Helping Hands Charity Association',
    description: 'Razão social da entidade beneficiária',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  companyName!: string;

  @ApiPropertyOptional({
    example: 'Helping Hands',
    description: 'Nome fantasia (opcional)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiProperty({
    example: '12.345.678/0001-90',
    description: 'CNPJ (14 dígitos, com ou sem pontuação)',
  })
  @IsString()
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, {
    message: 'cnpj must be in a valid format (14 digits, with or without punctuation)',
  })
  cnpj!: string;

  @ApiProperty({ example: 'contact@helpinghands.org', description: 'E-mail institucional' })
  @IsEmail()
  @MaxLength(200)
  institutionalEmail!: string;

  @ApiProperty({ example: '(11) 3456-7890', description: 'Celular institucional' })
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'institutionalPhone must be a valid Brazilian phone number',
  })
  institutionalPhone!: string;

  @ApiProperty({
    example: 'Entity that supports families in social vulnerability.',
    description: 'Descrição da entidade beneficiária',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ type: () => AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}

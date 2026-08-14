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
  @ApiProperty({ example: 'João Souza', description: 'Owner name', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'joao@example.com', description: 'Owner personal email' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiProperty({ example: '(11) 91234-5678', description: 'Owner personal phone' })
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'personalPhone must be a valid Brazilian phone number',
  })
  personalPhone!: string;

  @ApiProperty({
    example: 'strongPassword123',
    description: 'Access password (8 to 72 characters)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({
    example: 'Helping Hands Charity Association',
    description: 'Beneficiary entity legal (registered) name',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  companyName!: string;

  @ApiPropertyOptional({ example: 'Helping Hands', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiProperty({
    example: '12.345.678/0001-90',
    description: 'CNPJ (14 digits, with or without punctuation)',
  })
  @IsString()
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, {
    message: 'cnpj must be in a valid format (14 digits, with or without punctuation)',
  })
  cnpj!: string;

  @ApiProperty({ example: 'contact@helpinghands.org', description: 'Institutional email' })
  @IsEmail()
  @MaxLength(200)
  institutionalEmail!: string;

  @ApiProperty({ example: '(11) 3456-7890', description: 'Institutional phone' })
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'institutionalPhone must be a valid Brazilian phone number',
  })
  institutionalPhone!: string;

  @ApiProperty({
    example: 'Entity that supports families in social vulnerability.',
    description: 'Beneficiary entity description',
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

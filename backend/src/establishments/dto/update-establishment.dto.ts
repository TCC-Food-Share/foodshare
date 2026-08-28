import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

import { AddressDto } from './address.dto';

export class UpdateEstablishmentDto {
  @ApiPropertyOptional({
    example: '(11) 91234-5678',
    description: 'Celular pessoal do responsável',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'personalPhone must be a valid Brazilian phone number',
  })
  personalPhone?: string;

  @ApiPropertyOptional({ example: '(11) 3456-7890', description: 'Celular institucional' })
  @IsOptional()
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'institutionalPhone must be a valid Brazilian phone number',
  })
  institutionalPhone?: string;

  @ApiPropertyOptional({ example: 'contact@goodtaste.com', description: 'E-mail institucional' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  institutionalEmail?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.png',
    description: 'URL da imagem/logo (upload em si não faz parte deste endpoint)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @ApiPropertyOptional({
    example: 'Restaurant specialized in home-style meals.',
    description: 'Descrição do estabelecimento',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    type: () => AddressDto,
    description: 'Endereço completo — se enviado, todos os subcampos são obrigatórios',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

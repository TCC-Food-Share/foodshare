import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { trim, trimToNull } from '../../common/trim-to-null';
import { NoProhibitedContent } from '../../content-moderation/no-prohibited-content.validator';
import { AddressDto } from '../../establishments/dto/address.dto';

export class UpdateBeneficiaryEntityDto {
  @ApiPropertyOptional({
    example: 'Helping Hands',
    description:
      'Nome fantasia. Enviado vazio (ou só com espaços), apaga o nome fantasia, que volta a `null`.',
    maxLength: 200,
    nullable: true,
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoProhibitedContent()
  tradeName?: string | null;

  @ApiPropertyOptional({
    example: 'João Souza',
    description: 'Nome do responsável. Não pode ser vazio.',
    maxLength: 200,
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

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

  @ApiPropertyOptional({ example: 'contact@helpinghands.org', description: 'E-mail institucional' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  institutionalEmail?: string;

  @ApiPropertyOptional({
    example: 'Entity that supports families in social vulnerability.',
    description: 'Descrição da entidade beneficiária',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @NoProhibitedContent()
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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class AddressDto {
  @ApiProperty({ example: '01310-100', description: 'CEP, formato 00000-000 ou 00000000' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'postalCode must be in the format 00000-000 or 00000000' })
  postalCode!: string;

  @ApiProperty({ example: 'Avenida Paulista', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  street!: string;

  @ApiProperty({ example: '1000', maxLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  number!: string;

  @ApiPropertyOptional({ example: 'Suite 42', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  complement?: string;

  @ApiProperty({ example: 'São Paulo', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  city!: string;

  @ApiProperty({ example: 'SP', description: 'Sigla do estado (UF), 2 letras maiúsculas' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase state code' })
  state!: string;
}

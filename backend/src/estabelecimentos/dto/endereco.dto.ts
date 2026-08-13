import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class EnderecoDto {
  @ApiProperty({ example: '01310-100', description: 'CEP no formato 00000-000 ou 00000000' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'cep deve estar no formato 00000-000 ou 00000000' })
  cep!: string;

  @ApiProperty({ example: 'Avenida Paulista', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  logradouro!: string;

  @ApiProperty({ example: '1000', maxLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  numero!: string;

  @ApiPropertyOptional({ example: 'Sala 42', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  complemento?: string;

  @ApiProperty({ example: 'São Paulo', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cidade!: string;

  @ApiProperty({ example: 'SP', description: 'Sigla do estado (UF), 2 letras maiúsculas' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'estado deve ser a sigla de 2 letras maiúsculas' })
  estado!: string;
}

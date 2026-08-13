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

import { EnderecoDto } from './endereco.dto';

export class CriarEstabelecimentoDto {
  // Dados pessoais do responsável
  @ApiProperty({ example: 'Maria Silva', description: 'Nome do responsável', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nome!: string;

  @ApiProperty({ example: 'maria@exemplo.com', description: 'E-mail pessoal do responsável' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiProperty({ example: '(11) 91234-5678', description: 'Celular pessoal do responsável' })
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'celularPessoal deve ser um número de celular brasileiro válido',
  })
  celularPessoal!: string;

  @ApiProperty({
    example: 'senhaForte123',
    description: 'Senha de acesso (8 a 72 caracteres)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha!: string;

  // Dados institucionais
  @ApiProperty({
    example: 'Restaurante Bom Sabor Ltda',
    description: 'Razão social do estabelecimento',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  razaoSocial!: string;

  @ApiPropertyOptional({ example: 'Bom Sabor', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nomeFantasia?: string;

  @ApiProperty({
    example: '12.345.678/0001-90',
    description: 'CNPJ (14 dígitos, com ou sem máscara)',
  })
  @IsString()
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, {
    message: 'cnpj deve estar em formato válido (14 dígitos, com ou sem máscara)',
  })
  cnpj!: string;

  @ApiProperty({ example: 'contato@bomsabor.com', description: 'E-mail institucional' })
  @IsEmail()
  @MaxLength(200)
  emailInstitucional!: string;

  @ApiProperty({ example: '(11) 3456-7890', description: 'Celular institucional' })
  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'celularInstitucional deve ser um número de celular brasileiro válido',
  })
  celularInstitucional!: string;

  @ApiProperty({
    example: 'Restaurante especializado em pratos caseiros.',
    description: 'Descrição do estabelecimento',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descricao!: string;

  // Endereço
  @ApiProperty({ type: () => EnderecoDto })
  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco!: EnderecoDto;
}

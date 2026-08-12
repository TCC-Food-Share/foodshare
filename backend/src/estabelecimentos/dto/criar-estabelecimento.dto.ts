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
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nome!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'celularPessoal deve ser um número de celular brasileiro válido',
  })
  celularPessoal!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha!: string;

  // Dados institucionais
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  razaoSocial!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nomeFantasia?: string;

  @IsString()
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, {
    message: 'cnpj deve estar em formato válido (14 dígitos, com ou sem máscara)',
  })
  cnpj!: string;

  @IsEmail()
  @MaxLength(200)
  emailInstitucional!: string;

  @IsString()
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message: 'celularInstitucional deve ser um número de celular brasileiro válido',
  })
  celularInstitucional!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descricao!: string;

  // Endereço
  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco!: EnderecoDto;
}

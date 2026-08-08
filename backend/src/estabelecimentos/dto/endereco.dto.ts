import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class EnderecoDto {
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'cep deve estar no formato 00000-000 ou 00000000' })
  cep!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  logradouro!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  numero!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  complemento?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cidade!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'estado deve ser a sigla de 2 letras maiúsculas' })
  estado!: string;
}

import { ApiProperty } from '@nestjs/swagger';

class UsuarioRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Maria Silva' })
  nome!: string;

  @ApiProperty({ example: 'maria@exemplo.com' })
  email!: string;

  @ApiProperty({ example: '(11) 91234-5678' })
  celularPessoal!: string;
}

class EnderecoRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '01310-100' })
  cep!: string;

  @ApiProperty({ example: 'Avenida Paulista' })
  logradouro!: string;

  @ApiProperty({ example: '1000' })
  numero!: string;

  @ApiProperty({ example: 'Sala 42', nullable: true })
  complemento!: string | null;

  @ApiProperty({ example: 'São Paulo' })
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  estado!: string;
}

export class EstabelecimentoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Restaurante Bom Sabor Ltda' })
  razaoSocial!: string;

  @ApiProperty({ example: 'Bom Sabor', nullable: true })
  nomeFantasia!: string | null;

  @ApiProperty({ example: '12.345.678/0001-90' })
  cnpj!: string;

  @ApiProperty({ example: 'contato@bomsabor.com' })
  emailInstitucional!: string;

  @ApiProperty({ example: '(11) 3456-7890' })
  celularInstitucional!: string;

  @ApiProperty({ example: 'Restaurante especializado em pratos caseiros.' })
  descricao!: string;

  @ApiProperty({ type: () => UsuarioRespostaDto })
  usuario!: UsuarioRespostaDto;

  @ApiProperty({ type: () => EnderecoRespostaDto })
  endereco!: EnderecoRespostaDto;
}

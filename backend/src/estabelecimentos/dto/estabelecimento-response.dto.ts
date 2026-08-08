export interface EstabelecimentoResponseDto {
  id: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  emailInstitucional: string;
  celularInstitucional: string;
  descricao: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    celularPessoal: string;
  };
  endereco: {
    id: number;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    cidade: string;
    estado: string;
  };
}

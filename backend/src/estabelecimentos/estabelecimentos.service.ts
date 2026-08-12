import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEstabelecimentoDto } from './dto/criar-estabelecimento.dto';
import { EstabelecimentoResponseDto } from './dto/estabelecimento-response.dto';

const PAPEL_ESTABELECIMENTO = 'Estabelecimento';
const SALT_ROUNDS = 10;

const CAMPO_LABELS: Record<string, string> = {
  cnpj: 'CNPJ',
  emailInstitucional: 'e-mail institucional',
  celularInstitucional: 'celular institucional',
  email: 'e-mail pessoal',
  celularPessoal: 'celular pessoal',
};

function montarMensagemDuplicidade(campos: string[]): string {
  const labels = campos.map((campo) => CAMPO_LABELS[campo]);
  const lista =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
  const verbo = labels.length === 1 ? 'já está cadastrado' : 'já estão cadastrados';
  const mensagem = `${lista} ${verbo}.`;
  return mensagem.charAt(0).toUpperCase() + mensagem.slice(1);
}

@Injectable()
export class EstabelecimentosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarEstabelecimentoDto): Promise<EstabelecimentoResponseDto> {
    await this.verificarUnicidade(dto);

    const senhaHash = await hash(dto.senha, SALT_ROUNDS);

    try {
      const estabelecimento = await this.prisma.$transaction(async (tx) => {
        const papel = await tx.papel.findUniqueOrThrow({
          where: { nome: PAPEL_ESTABELECIMENTO },
        });

        const endereco = await tx.endereco.create({
          data: {
            cep: dto.endereco.cep,
            logradouro: dto.endereco.logradouro,
            numero: dto.endereco.numero,
            complemento: dto.endereco.complemento,
            cidade: dto.endereco.cidade,
            estado: dto.endereco.estado,
          },
        });

        const usuario = await tx.usuario.create({
          data: {
            nome: dto.nome,
            email: dto.email,
            celularPessoal: dto.celularPessoal,
            senha: senhaHash,
            idPapel: papel.id,
          },
        });

        return tx.estabelecimento.create({
          data: {
            razaoSocial: dto.razaoSocial,
            nomeFantasia: dto.nomeFantasia,
            cnpj: dto.cnpj,
            emailInstitucional: dto.emailInstitucional,
            celularInstitucional: dto.celularInstitucional,
            descricao: dto.descricao,
            idUsuario: usuario.id,
            idEndereco: endereco.id,
          },
          include: { usuario: true, endereco: true },
        });
      });

      return this.paraResposta(estabelecimento);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('CNPJ, e-mail ou celular já cadastrado.');
      }
      throw error;
    }
  }

  private async verificarUnicidade(dto: CriarEstabelecimentoDto): Promise<void> {
    const [
      usuarioPorEmail,
      usuarioPorCelular,
      estabelecimentoPorCnpj,
      estabelecimentoPorEmail,
      estabelecimentoPorCelular,
    ] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { email: dto.email } }),
      this.prisma.usuario.findUnique({ where: { celularPessoal: dto.celularPessoal } }),
      this.prisma.estabelecimento.findUnique({ where: { cnpj: dto.cnpj } }),
      this.prisma.estabelecimento.findUnique({
        where: { emailInstitucional: dto.emailInstitucional },
      }),
      this.prisma.estabelecimento.findUnique({
        where: { celularInstitucional: dto.celularInstitucional },
      }),
    ]);

    const camposDuplicados: string[] = [];
    if (usuarioPorEmail) camposDuplicados.push('email');
    if (usuarioPorCelular) camposDuplicados.push('celularPessoal');
    if (estabelecimentoPorCnpj) camposDuplicados.push('cnpj');
    if (estabelecimentoPorEmail) camposDuplicados.push('emailInstitucional');
    if (estabelecimentoPorCelular) camposDuplicados.push('celularInstitucional');

    if (camposDuplicados.length > 0) {
      throw new ConflictException({
        message: montarMensagemDuplicidade(camposDuplicados),
        campos: camposDuplicados,
      });
    }
  }

  private paraResposta(
    estabelecimento: Prisma.EstabelecimentoGetPayload<{
      include: { usuario: true; endereco: true };
    }>,
  ): EstabelecimentoResponseDto {
    return {
      id: estabelecimento.id,
      razaoSocial: estabelecimento.razaoSocial,
      nomeFantasia: estabelecimento.nomeFantasia,
      cnpj: estabelecimento.cnpj,
      emailInstitucional: estabelecimento.emailInstitucional,
      celularInstitucional: estabelecimento.celularInstitucional,
      descricao: estabelecimento.descricao,
      usuario: {
        id: estabelecimento.usuario.id,
        nome: estabelecimento.usuario.nome,
        email: estabelecimento.usuario.email,
        celularPessoal: estabelecimento.usuario.celularPessoal,
      },
      endereco: {
        id: estabelecimento.endereco.id,
        cep: estabelecimento.endereco.cep,
        logradouro: estabelecimento.endereco.logradouro,
        numero: estabelecimento.endereco.numero,
        complemento: estabelecimento.endereco.complemento,
        cidade: estabelecimento.endereco.cidade,
        estado: estabelecimento.endereco.estado,
      },
    };
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEstabelecimentoDto } from './dto/criar-estabelecimento.dto';
import { EstabelecimentoResponseDto } from './dto/estabelecimento-response.dto';

const PAPEL_ESTABELECIMENTO = 'Estabelecimento';
const SALT_ROUNDS = 10;

@Injectable()
export class EstabelecimentosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarEstabelecimentoDto): Promise<EstabelecimentoResponseDto> {
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

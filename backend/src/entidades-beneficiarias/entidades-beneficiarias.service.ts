import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEntidadeBeneficiariaDto } from './dto/criar-entidade-beneficiaria.dto';
import { EntidadeBeneficiariaResponseDto } from './dto/entidade-beneficiaria-response.dto';

const PAPEL_ENTIDADE_BENEFICIARIA = 'EntidadeBeneficiaria';
const SALT_ROUNDS = 10;

@Injectable()
export class EntidadesBeneficiariasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarEntidadeBeneficiariaDto): Promise<EntidadeBeneficiariaResponseDto> {
    const senhaHash = await hash(dto.senha, SALT_ROUNDS);

    try {
      const entidadeBeneficiaria = await this.prisma.$transaction(async (tx) => {
        const papel = await tx.papel.findUniqueOrThrow({
          where: { nome: PAPEL_ENTIDADE_BENEFICIARIA },
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

        return tx.entidadeBeneficiaria.create({
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

      return this.paraResposta(entidadeBeneficiaria);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('CNPJ, e-mail ou celular já cadastrado.');
      }
      throw error;
    }
  }

  private paraResposta(
    entidadeBeneficiaria: Prisma.EntidadeBeneficiariaGetPayload<{
      include: { usuario: true; endereco: true };
    }>,
  ): EntidadeBeneficiariaResponseDto {
    return {
      id: entidadeBeneficiaria.id,
      razaoSocial: entidadeBeneficiaria.razaoSocial,
      nomeFantasia: entidadeBeneficiaria.nomeFantasia,
      cnpj: entidadeBeneficiaria.cnpj,
      emailInstitucional: entidadeBeneficiaria.emailInstitucional,
      celularInstitucional: entidadeBeneficiaria.celularInstitucional,
      descricao: entidadeBeneficiaria.descricao,
      usuario: {
        id: entidadeBeneficiaria.usuario.id,
        nome: entidadeBeneficiaria.usuario.nome,
        email: entidadeBeneficiaria.usuario.email,
        celularPessoal: entidadeBeneficiaria.usuario.celularPessoal,
      },
      endereco: {
        id: entidadeBeneficiaria.endereco.id,
        cep: entidadeBeneficiaria.endereco.cep,
        logradouro: entidadeBeneficiaria.endereco.logradouro,
        numero: entidadeBeneficiaria.endereco.numero,
        complemento: entidadeBeneficiaria.endereco.complemento,
        cidade: entidadeBeneficiaria.endereco.cidade,
        estado: entidadeBeneficiaria.endereco.estado,
      },
    };
  }
}

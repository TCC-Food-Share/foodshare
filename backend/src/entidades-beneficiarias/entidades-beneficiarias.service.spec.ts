import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEntidadeBeneficiariaDto } from './dto/criar-entidade-beneficiaria.dto';
import { EntidadesBeneficiariasService } from './entidades-beneficiarias.service';

describe('EntidadesBeneficiariasService', () => {
  const dto: CriarEntidadeBeneficiariaDto = {
    nome: 'Responsável Teste',
    email: 'responsavel@teste.com',
    celularPessoal: '18999999999',
    senha: 'senha-segura',
    razaoSocial: 'Entidade Beneficiária Teste',
    nomeFantasia: 'Entidade Beneficiária Teste',
    cnpj: '12345678000199',
    emailInstitucional: 'contato@teste.com',
    celularInstitucional: '18988888888',
    descricao: 'Descrição de teste',
    endereco: {
      cep: '16200-000',
      logradouro: 'Rua Teste',
      numero: '123',
      complemento: undefined,
      cidade: 'Birigui',
      estado: 'SP',
    },
  };

  const tx = {
    papel: { findUniqueOrThrow: jest.fn<() => Promise<unknown>>() },
    endereco: { create: jest.fn<() => Promise<unknown>>() },
    usuario: { create: jest.fn<() => Promise<unknown>>() },
    entidadeBeneficiaria: { create: jest.fn<() => Promise<unknown>>() },
  };

  const prismaMock = {
    $transaction: jest.fn<(callback: (transactionClient: typeof tx) => unknown) => unknown>(),
  };

  let service: EntidadesBeneficiariasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const moduleRef = await Test.createTestingModule({
      providers: [EntidadesBeneficiariasService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(EntidadesBeneficiariasService);
  });

  function mockCriacaoComSucesso() {
    tx.papel.findUniqueOrThrow.mockResolvedValue({ id: 2, nome: 'EntidadeBeneficiaria' });
    tx.endereco.create.mockResolvedValue({ id: 10, ...dto.endereco, complemento: null });
    tx.usuario.create.mockResolvedValue({
      id: 20,
      nome: dto.nome,
      email: dto.email,
      celularPessoal: dto.celularPessoal,
      senha: 'hash-da-senha',
    });
    tx.entidadeBeneficiaria.create.mockResolvedValue({
      id: 30,
      razaoSocial: dto.razaoSocial,
      nomeFantasia: dto.nomeFantasia,
      cnpj: dto.cnpj,
      emailInstitucional: dto.emailInstitucional,
      celularInstitucional: dto.celularInstitucional,
      descricao: dto.descricao,
      usuario: {
        id: 20,
        nome: dto.nome,
        email: dto.email,
        celularPessoal: dto.celularPessoal,
        senha: 'hash-da-senha',
      },
      endereco: { id: 10, ...dto.endereco, complemento: null },
    });
  }

  it('cria usuário, endereço e entidade beneficiária numa única transação', async () => {
    mockCriacaoComSucesso();

    const resultado = await service.criar(dto);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.endereco.create).toHaveBeenCalledTimes(1);
    expect(tx.usuario.create).toHaveBeenCalledTimes(1);
    expect(tx.entidadeBeneficiaria.create).toHaveBeenCalledTimes(1);
    expect(resultado.id).toBe(30);
    expect(resultado.usuario.email).toBe(dto.email);
  });

  it('nunca retorna a senha (hash ou texto) na resposta', async () => {
    mockCriacaoComSucesso();

    const resultado = await service.criar(dto);
    const resultadoSerializado = JSON.stringify(resultado);

    expect(resultado).not.toHaveProperty('senha');
    expect(resultado.usuario).not.toHaveProperty('senha');
    expect(resultadoSerializado).not.toContain('hash-da-senha');
    expect(resultadoSerializado).not.toContain(dto.senha);
  });

  it('lança ConflictException genérica quando o Prisma reporta violação de unicidade (P2002)', async () => {
    prismaMock.$transaction.mockImplementation(() => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
    });

    await expect(service.criar(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga outros erros sem convertê-los', async () => {
    const erroInesperado = new Error('falha de conexão');
    prismaMock.$transaction.mockImplementation(() => {
      throw erroInesperado;
    });

    await expect(service.criar(dto)).rejects.toBe(erroInesperado);
  });
});

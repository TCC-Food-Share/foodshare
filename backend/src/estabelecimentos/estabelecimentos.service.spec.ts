import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEstabelecimentoDto } from './dto/criar-estabelecimento.dto';
import { EstabelecimentosService } from './estabelecimentos.service';

describe('EstabelecimentosService', () => {
  const dto: CriarEstabelecimentoDto = {
    nome: 'Responsável Teste',
    email: 'responsavel@teste.com',
    celularPessoal: '18999999999',
    senha: 'senha-segura',
    razaoSocial: 'Estabelecimento Teste LTDA',
    nomeFantasia: 'Estabelecimento Teste LTDA',
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
    estabelecimento: { create: jest.fn<() => Promise<unknown>>() },
  };

  const prismaMock = {
    usuario: {
      findUnique: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
    },
    estabelecimento: {
      findUnique: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
    },
  };

  let service: EstabelecimentosService;
  let transaction: jest.Mock<(callback: (transactionClient: typeof tx) => unknown) => unknown>;

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction = jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx));
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    prismaMock.estabelecimento.findUnique.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        EstabelecimentosService,
        {
          provide: PrismaService,
          useValue: { $transaction: transaction, ...prismaMock },
        },
      ],
    }).compile();

    service = moduleRef.get(EstabelecimentosService);
  });

  function mockCriacaoComSucesso() {
    tx.papel.findUniqueOrThrow.mockResolvedValue({ id: 1, nome: 'Estabelecimento' });
    tx.endereco.create.mockResolvedValue({ id: 10, ...dto.endereco, complemento: null });
    tx.usuario.create.mockResolvedValue({
      id: 20,
      nome: dto.nome,
      email: dto.email,
      celularPessoal: dto.celularPessoal,
      senha: 'hash-da-senha',
    });
    tx.estabelecimento.create.mockResolvedValue({
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

  it('cria usuário, endereço e estabelecimento numa única transação', async () => {
    mockCriacaoComSucesso();

    const resultado = await service.criar(dto);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.endereco.create).toHaveBeenCalledTimes(1);
    expect(tx.usuario.create).toHaveBeenCalledTimes(1);
    expect(tx.estabelecimento.create).toHaveBeenCalledTimes(1);
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

  it('lança ConflictException com campos: ["cnpj"] quando só o CNPJ já está cadastrado', async () => {
    prismaMock.estabelecimento.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('cnpj' in where ? { id: 99 } : null),
    );

    await expect(service.criar(dto)).rejects.toMatchObject({
      response: { campos: ['cnpj'] },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('lança ConflictException com todos os campos duplicados numa única resposta', async () => {
    prismaMock.usuario.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('celularPessoal' in where ? { id: 88 } : null),
    );
    prismaMock.estabelecimento.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('emailInstitucional' in where ? { id: 99 } : null),
    );

    await expect(service.criar(dto)).rejects.toMatchObject({
      response: { campos: ['celularPessoal', 'emailInstitucional'] },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('segue para a criação quando nenhum campo está duplicado', async () => {
    mockCriacaoComSucesso();

    await service.criar(dto);

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('lança ConflictException quando o Prisma reporta violação de unicidade (P2002)', async () => {
    transaction.mockImplementation(() => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
    });

    await expect(service.criar(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga outros erros sem convertê-los', async () => {
    const erroInesperado = new Error('falha de conexão');
    transaction.mockImplementation(() => {
      throw erroInesperado;
    });

    await expect(service.criar(dto)).rejects.toBe(erroInesperado);
  });
});

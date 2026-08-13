import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { Prisma } from '../generated/prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EntidadesBeneficiariasModule } from './../src/entidades-beneficiarias/entidades-beneficiarias.module';

describe('EntidadesBeneficiariasController (e2e)', () => {
  let app: INestApplication<App>;

  const tx = {
    papel: { findUniqueOrThrow: jest.fn<() => Promise<unknown>>() },
    endereco: { create: jest.fn<() => Promise<unknown>>() },
    usuario: { create: jest.fn<() => Promise<unknown>>() },
    entidadeBeneficiaria: { create: jest.fn<() => Promise<unknown>>() },
  };
  const prismaMock = {
    $transaction: jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx)),
  };

  const dtoValido = {
    nome: 'Responsável Teste',
    email: 'responsavel@teste.com',
    celularPessoal: '18999999999',
    senha: 'senha-segura',
    razaoSocial: 'Entidade Beneficiária Teste',
    cnpj: '12345678000199',
    emailInstitucional: 'contato@teste.com',
    celularInstitucional: '18988888888',
    descricao: 'Descrição de teste',
    endereco: {
      cep: '16200-000',
      logradouro: 'Rua Teste',
      numero: '123',
      cidade: 'Birigui',
      estado: 'SP',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, EntidadesBeneficiariasModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /entidades-beneficiarias com dados válidos cria o cadastro e não expõe a senha', async () => {
    tx.papel.findUniqueOrThrow.mockResolvedValue({ id: 2, nome: 'EntidadeBeneficiaria' });
    tx.endereco.create.mockResolvedValue({ id: 10, ...dtoValido.endereco, complemento: null });
    tx.usuario.create.mockResolvedValue({
      id: 20,
      nome: dtoValido.nome,
      email: dtoValido.email,
      celularPessoal: dtoValido.celularPessoal,
      senha: 'hash-da-senha',
    });
    tx.entidadeBeneficiaria.create.mockResolvedValue({
      id: 30,
      razaoSocial: dtoValido.razaoSocial,
      nomeFantasia: null,
      cnpj: dtoValido.cnpj,
      emailInstitucional: dtoValido.emailInstitucional,
      celularInstitucional: dtoValido.celularInstitucional,
      descricao: dtoValido.descricao,
      usuario: {
        id: 20,
        nome: dtoValido.nome,
        email: dtoValido.email,
        celularPessoal: dtoValido.celularPessoal,
        senha: 'hash-da-senha',
      },
      endereco: { id: 10, ...dtoValido.endereco, complemento: null },
    });

    const resposta = await request(app.getHttpServer())
      .post('/entidades-beneficiarias')
      .send(dtoValido)
      .expect(201);

    expect(resposta.body.id).toBe(30);
    expect(JSON.stringify(resposta.body)).not.toContain('hash-da-senha');
    expect(JSON.stringify(resposta.body)).not.toContain(dtoValido.senha);
  });

  it('POST /entidades-beneficiarias sem campo obrigatório retorna 400 e não persiste nada', async () => {
    const { cnpj: _cnpj, ...semCnpj } = dtoValido;

    await request(app.getHttpServer()).post('/entidades-beneficiarias').send(semCnpj).expect(400);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['email', { email: 'nao-e-um-email' }],
    ['cnpj', { cnpj: '123' }],
    ['endereco.estado', { endereco: { ...dtoValido.endereco, estado: 'SPX' } }],
  ])(
    'POST /entidades-beneficiarias com %s em formato inválido retorna 400',
    async (_campo, override) => {
      await request(app.getHttpServer())
        .post('/entidades-beneficiarias')
        .send({ ...dtoValido, ...override })
        .expect(400);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    },
  );

  it('POST /entidades-beneficiarias com CNPJ/e-mail/celular duplicado retorna 409 genérico', async () => {
    prismaMock.$transaction.mockImplementation(() => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
    });

    await request(app.getHttpServer()).post('/entidades-beneficiarias').send(dtoValido).expect(409);
  });
});

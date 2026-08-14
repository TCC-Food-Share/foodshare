import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { EstablishmentsService } from './establishments.service';

describe('EstablishmentsService', () => {
  const dto: CreateEstablishmentDto = {
    name: 'Test Owner',
    email: 'owner@test.com',
    personalPhone: '18999999999',
    password: 'strong-password',
    companyName: 'Test Establishment Ltd',
    tradeName: 'Test Establishment Ltd',
    cnpj: '12345678000199',
    institutionalEmail: 'contact@test.com',
    institutionalPhone: '18988888888',
    description: 'Test description',
    address: {
      postalCode: '16200-000',
      street: 'Test Street',
      number: '123',
      complement: undefined,
      city: 'Birigui',
      state: 'SP',
    },
  };

  const authMock = {
    api: {
      signUpEmail:
        jest.fn<
          (args: {
            body: Record<string, unknown>;
          }) => Promise<{ token: string | null; user: { id: string } }>
        >(),
    },
  };

  const tx = {
    address: { create: jest.fn<(args: unknown) => Promise<unknown>>() },
    establishment: { create: jest.fn<(args: unknown) => Promise<unknown>>() },
  };

  const prismaMock = {
    role: { findUniqueOrThrow: jest.fn<() => Promise<unknown>>() },
    user: {
      findUnique: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
      delete: jest.fn<(args: { where: { id: number } }) => Promise<unknown>>(),
    },
    establishment: {
      findUnique: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
    },
  };

  let service: EstablishmentsService;
  let transaction: jest.Mock<(callback: (transactionClient: typeof tx) => unknown) => unknown>;

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction = jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx));
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.delete.mockResolvedValue(undefined);
    prismaMock.establishment.findUnique.mockResolvedValue(null);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({ id: 1, name: 'Establishment' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        EstablishmentsService,
        {
          provide: PrismaService,
          useValue: { $transaction: transaction, ...prismaMock },
        },
        { provide: BETTER_AUTH, useValue: authMock },
      ],
    }).compile();

    service = moduleRef.get(EstablishmentsService);
  });

  function mockSuccessfulCreation(userId = '20') {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: userId } });
    tx.address.create.mockResolvedValue({ id: 10, ...dto.address, complement: null });
    tx.establishment.create.mockResolvedValue({
      id: 30,
      companyName: dto.companyName,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      institutionalEmail: dto.institutionalEmail,
      institutionalPhone: dto.institutionalPhone,
      description: dto.description,
      user: {
        id: Number(userId),
        name: dto.name,
        email: dto.email,
        personalPhone: dto.personalPhone,
      },
      address: { id: 10, ...dto.address, complement: null },
    });
  }

  it('creates the user via better-auth and the address/establishment in a transaction', async () => {
    mockSuccessfulCreation();

    const result = await service.create(dto);

    expect(authMock.api.signUpEmail).toHaveBeenCalledWith({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        personalPhone: dto.personalPhone,
        roleId: 1,
      },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.address.create).toHaveBeenCalledTimes(1);
    expect(tx.establishment.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(30);
    expect(result.user.email).toBe(dto.email);
  });

  it('converts the user id (string, from better-auth) to a number before using it', async () => {
    mockSuccessfulCreation('42');

    await service.create(dto);

    expect(tx.establishment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 42 }) }),
    );
  });

  it('never returns the password (hash or plain text) in the response', async () => {
    mockSuccessfulCreation();

    const result = await service.create(dto);
    const serialized = JSON.stringify(result);

    expect(result).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('password');
    expect(serialized).not.toContain(dto.password);
  });

  it('throws ConflictException with fields: ["cnpj"] when only the CNPJ is already registered', async () => {
    prismaMock.establishment.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('cnpj' in where ? { id: 99 } : null),
    );

    await expect(service.create(dto)).rejects.toMatchObject({
      response: { fields: ['cnpj'] },
    });
    expect(authMock.api.signUpEmail).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('throws ConflictException with every duplicate field in a single response', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('personalPhone' in where ? { id: 88 } : null),
    );
    prismaMock.establishment.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('institutionalEmail' in where ? { id: 99 } : null),
    );

    await expect(service.create(dto)).rejects.toMatchObject({
      response: { fields: ['personalPhone', 'institutionalEmail'] },
    });
    expect(authMock.api.signUpEmail).not.toHaveBeenCalled();
  });

  it('proceeds with creation when no field is duplicated', async () => {
    mockSuccessfulCreation();

    await service.create(dto);

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictException when better-auth rejects signUpEmail', async () => {
    authMock.api.signUpEmail.mockRejectedValue(new Error('email already in use'));

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('removes the user as compensation if the 2nd step fails after the user was created', async () => {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: '20' } });
    const unexpectedError = new Error('connection failure');
    transaction.mockImplementation(() => {
      throw unexpectedError;
    });

    await expect(service.create(dto)).rejects.toBe(unexpectedError);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 20 } });
  });

  it('throws ConflictException when Prisma reports P2002 in the 2nd step, and still removes the orphan user', async () => {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: '21' } });
    transaction.mockImplementation(() => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 21 } });
  });

  it('propagates other 2nd-step errors without converting them', async () => {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: '22' } });
    const unexpectedError = new Error('connection failure');
    transaction.mockImplementation(() => {
      throw unexpectedError;
    });

    await expect(service.create(dto)).rejects.toBe(unexpectedError);
  });
});

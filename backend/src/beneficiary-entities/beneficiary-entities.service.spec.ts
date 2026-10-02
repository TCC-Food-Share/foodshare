import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { PrismaService } from '../prisma/prisma.service';
import { BeneficiaryEntitiesService } from './beneficiary-entities.service';
import { CreateBeneficiaryEntityDto } from './dto/create-beneficiary-entity.dto';
import { UpdateBeneficiaryEntityDto } from './dto/update-beneficiary-entity.dto';

describe('BeneficiaryEntitiesService', () => {
  const dto: CreateBeneficiaryEntityDto = {
    name: 'Test Owner',
    email: 'owner@test.com',
    personalPhone: '18999999999',
    password: 'strong-password',
    companyName: 'Test Beneficiary Entity',
    tradeName: 'Test Beneficiary Entity',
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
    address: {
      create: jest.fn<(args: unknown) => Promise<unknown>>(),
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    beneficiaryEntity: {
      create: jest.fn<(args: unknown) => Promise<unknown>>(),
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
    user: {
      update: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
  };

  const prismaMock = {
    role: { findUniqueOrThrow: jest.fn<() => Promise<unknown>>() },
    user: {
      findUnique: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
      findFirst: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
      delete: jest.fn<(args: { where: { id: number } }) => Promise<unknown>>(),
    },
    beneficiaryEntity: {
      findUnique: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
      findFirst: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
    },
  };

  let service: BeneficiaryEntitiesService;
  let transaction: jest.Mock<(callback: (transactionClient: typeof tx) => unknown) => unknown>;

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction = jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx));
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.delete.mockResolvedValue(undefined);
    prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);
    prismaMock.beneficiaryEntity.findFirst.mockResolvedValue(null);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({ id: 2, name: 'BeneficiaryEntity' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        BeneficiaryEntitiesService,
        {
          provide: PrismaService,
          useValue: { $transaction: transaction, ...prismaMock },
        },
        { provide: BETTER_AUTH, useValue: authMock },
      ],
    }).compile();

    service = moduleRef.get(BeneficiaryEntitiesService);
  });

  function mockSuccessfulCreation(userId = '20') {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: userId } });
    tx.address.create.mockResolvedValue({ id: 10, ...dto.address, complement: null });
    tx.beneficiaryEntity.create.mockResolvedValue({
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

  it('creates the user via better-auth and the address/beneficiary entity in a transaction', async () => {
    mockSuccessfulCreation();

    const result = await service.create(dto);

    expect(authMock.api.signUpEmail).toHaveBeenCalledWith({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        personalPhone: dto.personalPhone,
        roleId: 2,
      },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.address.create).toHaveBeenCalledTimes(1);
    expect(tx.beneficiaryEntity.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(30);
    expect(result.user.email).toBe(dto.email);
  });

  it('converts the user id (string, from better-auth) to a number before using it', async () => {
    mockSuccessfulCreation('42');

    await service.create(dto);

    expect(tx.beneficiaryEntity.create).toHaveBeenCalledWith(
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
    prismaMock.beneficiaryEntity.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('cnpj' in where ? { id: 99 } : null),
    );

    await expect(service.create(dto)).rejects.toMatchObject({
      response: { fields: ['cnpj'] },
    });
    expect(authMock.api.signUpEmail).not.toHaveBeenCalled();
  });

  it('throws ConflictException with every duplicate field in a single response', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('personalPhone' in where ? { id: 88 } : null),
    );
    prismaMock.beneficiaryEntity.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('institutionalEmail' in where ? { id: 99 } : null),
    );

    await expect(service.create(dto)).rejects.toMatchObject({
      response: { fields: ['institutionalEmail', 'personal'] },
    });
    expect(authMock.api.signUpEmail).not.toHaveBeenCalled();
  });

  it('does not reveal whether the personal email or the personal phone is the duplicate', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('email' in where ? { id: 77 } : null),
    );

    await expect(service.create(dto)).rejects.toMatchObject({
      response: { fields: ['personal'], message: 'Personal email or phone is already registered.' },
    });
  });

  it('collapses duplicate personal email and personal phone into a single "personal" entry', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 77 });

    await expect(service.create(dto)).rejects.toMatchObject({
      response: { fields: ['personal'] },
    });
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

  describe('update', () => {
    const existingEntity = {
      id: 30,
      userId: 20,
      addressId: 10,
      companyName: dto.companyName,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      institutionalEmail: dto.institutionalEmail,
      institutionalPhone: dto.institutionalPhone,
      description: dto.description,
    };

    function mockUpdatedResult(overrides: Partial<typeof existingEntity> = {}) {
      const merged = { ...existingEntity, ...overrides };
      tx.beneficiaryEntity.update.mockResolvedValue({
        ...merged,
        user: { id: 20, name: dto.name, email: dto.email, personalPhone: dto.personalPhone },
        address: { id: 10, ...dto.address, complement: null },
      });
    }

    it('updates only the field sent (description)', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(existingEntity);
      mockUpdatedResult({ description: 'New description' });
      const updateDto: UpdateBeneficiaryEntityDto = { description: 'New description' };

      const result = await service.update(20, updateDto);

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.address.update).not.toHaveBeenCalled();
      expect(tx.beneficiaryEntity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 30 },
          data: { description: 'New description' },
        }),
      );
      expect(result.description).toBe('New description');
    });

    it('throws NotFoundException when the authenticated user has no beneficiary entity', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { description: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException when institutionalPhone is already used by another entity', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(existingEntity);
      prismaMock.beneficiaryEntity.findFirst.mockImplementation(({ where }) =>
        Promise.resolve('institutionalPhone' in where ? { id: 99 } : null),
      );

      await expect(service.update(20, { institutionalPhone: '18977777777' })).rejects.toMatchObject(
        { response: { fields: ['institutionalPhone'] } },
      );
      expect(tx.beneficiaryEntity.update).not.toHaveBeenCalled();
    });

    it('excludes the entity itself from the uniqueness check', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(existingEntity);
      mockUpdatedResult();

      await service.update(20, { institutionalEmail: dto.institutionalEmail });

      expect(prismaMock.beneficiaryEntity.findFirst).toHaveBeenCalledWith({
        where: { institutionalEmail: dto.institutionalEmail, NOT: { id: 30 } },
      });
    });

    it('updates address only when the full sub-object is sent', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(existingEntity);
      mockUpdatedResult();

      await service.update(20, { address: dto.address });

      expect(tx.address.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          postalCode: dto.address.postalCode,
          street: dto.address.street,
          number: dto.address.number,
          complement: dto.address.complement,
          city: dto.address.city,
          state: dto.address.state,
        },
      });
    });

    it('returns the updated data without the password', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(existingEntity);
      mockUpdatedResult();

      const result = await service.update(20, { description: 'New description' });
      const serialized = JSON.stringify(result);

      expect(result).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('password');
      expect(serialized).not.toContain(dto.password);
    });

    it('throws ConflictException when Prisma reports P2002 during the update transaction', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(existingEntity);
      tx.beneficiaryEntity.update.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        });
      });

      await expect(
        service.update(20, { institutionalEmail: 'new@test.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

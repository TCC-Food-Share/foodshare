import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { BETTER_AUTH } from '../auth/better-auth.token';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
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

  const image: ValidatedImage = { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), type: 'png' };

  const storageMock = {
    store: jest.fn<(folder: string, image: ValidatedImage) => Promise<string>>(),
    removeQuietly: jest.fn<(key: string) => Promise<void>>(),
    toUrl: (key: string | null | undefined) => (key ? `https://api.test/files/${key}` : null),
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
    establishment: {
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
    establishment: {
      findUnique: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
      findFirst: jest.fn<(args: { where: Record<string, unknown> }) => Promise<unknown>>(),
      findMany:
        jest.fn<
          (args: {
            where: Record<string, unknown>;
            select: Record<string, unknown>;
          }) => Promise<unknown>
        >(),
    },
    $queryRaw: jest.fn<(sql: Prisma.Sql) => Promise<unknown>>(),
  };

  let service: EstablishmentsService;
  let transaction: jest.Mock<(callback: (transactionClient: typeof tx) => unknown) => unknown>;

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction = jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx));
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.delete.mockResolvedValue(undefined);
    prismaMock.establishment.findUnique.mockResolvedValue(null);
    prismaMock.establishment.findFirst.mockResolvedValue(null);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({ id: 1, name: 'Establishment' });
    storageMock.store.mockResolvedValue('users/new.png');
    storageMock.removeQuietly.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        EstablishmentsService,
        {
          provide: PrismaService,
          useValue: { $transaction: transaction, ...prismaMock },
        },
        { provide: BETTER_AUTH, useValue: authMock },
        { provide: ImageStorageService, useValue: storageMock },
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
        image: 'users/new.png',
      },
      address: { id: 10, ...dto.address, complement: null },
    });
  }

  it('creates the user via better-auth and the address/establishment in a transaction', async () => {
    mockSuccessfulCreation();

    const result = await service.create(dto, image);

    expect(authMock.api.signUpEmail).toHaveBeenCalledWith({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        personalPhone: dto.personalPhone,
        image: 'users/new.png',
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

    await service.create(dto, image);

    expect(tx.establishment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 42 }) }),
    );
  });

  it('never returns the password (hash or plain text) in the response', async () => {
    mockSuccessfulCreation();

    const result = await service.create(dto, image);
    const serialized = JSON.stringify(result);

    expect(result).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('password');
    expect(serialized).not.toContain(dto.password);
  });

  it('throws ConflictException with fields: ["cnpj"] when only the CNPJ is already registered', async () => {
    prismaMock.establishment.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('cnpj' in where ? { id: 99 } : null),
    );

    await expect(service.create(dto, image)).rejects.toMatchObject({
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

    await expect(service.create(dto, image)).rejects.toMatchObject({
      response: { fields: ['institutionalEmail', 'personal'] },
    });
    expect(authMock.api.signUpEmail).not.toHaveBeenCalled();
  });

  it('does not reveal whether the personal email or the personal phone is the duplicate', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }) =>
      Promise.resolve('email' in where ? { id: 77 } : null),
    );

    await expect(service.create(dto, image)).rejects.toMatchObject({
      response: { fields: ['personal'], message: 'Personal email or phone is already registered.' },
    });
  });

  it('collapses duplicate personal email and personal phone into a single "personal" entry', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 77 });

    await expect(service.create(dto, image)).rejects.toMatchObject({
      response: { fields: ['personal'] },
    });
  });

  it('proceeds with creation when no field is duplicated', async () => {
    mockSuccessfulCreation();

    await service.create(dto, image);

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictException when better-auth rejects signUpEmail', async () => {
    authMock.api.signUpEmail.mockRejectedValue(new Error('email already in use'));

    await expect(service.create(dto, image)).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('removes the user as compensation if the 2nd step fails after the user was created', async () => {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: '20' } });
    const unexpectedError = new Error('connection failure');
    transaction.mockImplementation(() => {
      throw unexpectedError;
    });

    await expect(service.create(dto, image)).rejects.toBe(unexpectedError);
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

    await expect(service.create(dto, image)).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 21 } });
  });

  it('propagates other 2nd-step errors without converting them', async () => {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: '22' } });
    const unexpectedError = new Error('connection failure');
    transaction.mockImplementation(() => {
      throw unexpectedError;
    });

    await expect(service.create(dto, image)).rejects.toBe(unexpectedError);
  });

  it('stores the image under the users folder and answers with its URL', async () => {
    mockSuccessfulCreation();

    const result = await service.create(dto, image);

    expect(storageMock.store).toHaveBeenCalledWith('users', image);
    expect(result.user.image).toBe('https://api.test/files/users/new.png');
  });

  it('stores no image when the uniqueness check rejects the registration', async () => {
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 99 });

    await expect(service.create(dto, image)).rejects.toBeInstanceOf(ConflictException);
    expect(storageMock.store).not.toHaveBeenCalled();
  });

  it('removes the stored image when better-auth rejects signUpEmail', async () => {
    authMock.api.signUpEmail.mockRejectedValue(new Error('email already in use'));

    await expect(service.create(dto, image)).rejects.toBeInstanceOf(ConflictException);
    expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
  });

  it('removes the user and the stored image when the transaction fails', async () => {
    authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: '23' } });
    transaction.mockImplementation(() => {
      throw new Error('connection failure');
    });

    await expect(service.create(dto, image)).rejects.toThrow('connection failure');
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 23 } });
    expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
  });

  describe('update', () => {
    const existingEstablishment = {
      id: 30,
      userId: 20,
      addressId: 10,
      companyName: dto.companyName,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      institutionalEmail: dto.institutionalEmail,
      institutionalPhone: dto.institutionalPhone,
      description: dto.description,
      user: { id: 20, image: 'users/old.png' as string | null },
    };

    function mockUpdatedResult(
      overrides: Partial<typeof existingEstablishment> = {},
      userImage: string | null = 'users/old.png',
    ) {
      const merged = { ...existingEstablishment, ...overrides };
      tx.establishment.update.mockResolvedValue({
        ...merged,
        user: {
          id: 20,
          name: dto.name,
          email: dto.email,
          personalPhone: dto.personalPhone,
          image: userImage,
        },
        address: { id: 10, ...dto.address, complement: null },
      });
    }

    it('updates only the field sent (description)', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      mockUpdatedResult({ description: 'New description' });
      const updateDto: UpdateEstablishmentDto = { description: 'New description' };

      const result = await service.update(20, updateDto);

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.address.update).not.toHaveBeenCalled();
      expect(storageMock.store).not.toHaveBeenCalled();
      expect(storageMock.removeQuietly).not.toHaveBeenCalled();
      expect(tx.establishment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 30 },
          data: { description: 'New description' },
        }),
      );
      expect(result.description).toBe('New description');
    });

    it('saves the responsible name on the user and the trade name on the institution', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      mockUpdatedResult();

      await service.update(20, { name: 'Ana Lima', tradeName: 'New Trade Name' });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { name: 'Ana Lima' },
      });
      expect(tx.establishment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tradeName: 'New Trade Name' } }),
      );
    });

    it('clears the trade name when it comes as null', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      mockUpdatedResult();

      await service.update(20, { tradeName: null });

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.establishment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tradeName: null } }),
      );
    });

    it('keeps the trade name and the responsible name when they are not sent', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      mockUpdatedResult();

      await service.update(20, { personalPhone: '18988887777' });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { personalPhone: '18988887777' },
      });
      expect(tx.establishment.update).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
    });

    it('throws NotFoundException when the authenticated user has no establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { description: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException when institutionalPhone is already used by another establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      prismaMock.establishment.findFirst.mockImplementation(({ where }) =>
        Promise.resolve('institutionalPhone' in where ? { id: 99 } : null),
      );

      await expect(service.update(20, { institutionalPhone: '18977777777' })).rejects.toMatchObject(
        { response: { fields: ['institutionalPhone'] } },
      );
      expect(tx.establishment.update).not.toHaveBeenCalled();
    });

    it('excludes the establishment itself from the uniqueness check', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      mockUpdatedResult();

      await service.update(20, { institutionalEmail: dto.institutionalEmail });

      expect(prismaMock.establishment.findFirst).toHaveBeenCalledWith({
        where: { institutionalEmail: dto.institutionalEmail, NOT: { id: 30 } },
      });
    });

    it('updates address only when the full sub-object is sent', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
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
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      mockUpdatedResult();

      const result = await service.update(20, { description: 'New description' });
      const serialized = JSON.stringify(result);

      expect(result).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('password');
      expect(serialized).not.toContain(dto.password);
    });

    it('throws ConflictException when Prisma reports P2002 during the update transaction', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      tx.establishment.update.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        });
      });

      await expect(
        service.update(20, { institutionalEmail: 'new@test.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('swaps the image and removes the previous one after the commit', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      mockUpdatedResult({}, 'users/new.png');

      const result = await service.update(20, {}, image);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { image: 'users/new.png' },
      });
      expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/old.png');
      expect(storageMock.removeQuietly).not.toHaveBeenCalledWith('users/new.png');
      expect(result.user.image).toBe('https://api.test/files/users/new.png');
    });

    it('removes nothing when a registration without image gets its first one', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue({
        ...existingEstablishment,
        user: { id: 20, image: null },
      });
      mockUpdatedResult({}, 'users/new.png');

      await service.update(20, {}, image);

      expect(storageMock.removeQuietly).not.toHaveBeenCalled();
    });

    it('keeps the previous image and removes the new one when the update fails', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      tx.establishment.update.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        });
      });

      await expect(
        service.update(20, { institutionalPhone: '18977777777' }, image),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
      expect(storageMock.removeQuietly).not.toHaveBeenCalledWith('users/old.png');
    });

    it('stores no image when the uniqueness check rejects the update', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(existingEstablishment);
      prismaMock.establishment.findFirst.mockResolvedValue({ id: 99 });

      await expect(
        service.update(20, { institutionalPhone: '18977777777' }, image),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(storageMock.store).not.toHaveBeenCalled();
    });
  });

  describe('public listing and profile (RF10, RF12, RF13, RN35, RN36)', () => {
    const sqlText = (sql: Prisma.Sql): string => sql.strings.join(' ');

    const publicRow = (overrides: Record<string, unknown> = {}) => ({
      id: 7,
      tradeName: 'Good Taste',
      companyName: 'Good Taste Ltd',
      description: 'Public description',
      user: { image: 'users/seven.png' },
      address: { city: 'Birigui', state: 'SP' },
      ...overrides,
    });

    beforeEach(() => {
      prismaMock.$queryRaw.mockImplementation((sql: Prisma.Sql) =>
        Promise.resolve(
          sqlText(sql).includes('count(*)') ? [{ count: BigInt(2) }] : [{ id: 8 }, { id: 7 }],
        ),
      );
      prismaMock.establishment.findMany.mockResolvedValue([
        publicRow(),
        publicRow({ id: 8, tradeName: null, companyName: 'Aurora Market Ltd' }),
      ]);
    });

    it('returns only the public keys of each item, in the page order', async () => {
      const result = await service.listPublic({});

      expect(result).toEqual({
        data: [
          {
            id: 8,
            name: 'Aurora Market Ltd',
            image: 'https://api.test/files/users/seven.png',
            city: 'Birigui',
            state: 'SP',
          },
          {
            id: 7,
            name: 'Good Taste',
            image: 'https://api.test/files/users/seven.png',
            city: 'Birigui',
            state: 'SP',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      });
      for (const item of result.data) {
        expect(Object.keys(item).sort()).toEqual(['city', 'id', 'image', 'name', 'state']);
      }
    });

    it('hydrates with the public select only', async () => {
      await service.listPublic({});

      const args = prismaMock.establishment.findMany.mock.calls[0][0];
      expect(Object.keys(args.select).sort()).toEqual(
        ['address', 'companyName', 'description', 'id', 'tradeName', 'user'].sort(),
      );
    });

    it('filters out deleted and unconfirmed institutions in SQL', async () => {
      await service.listPublic({});

      const text = sqlText(prismaMock.$queryRaw.mock.calls[0][0]);
      expect(text).toContain('i.deleted = false');
      expect(text).toContain('u."emailVerified" = true');
    });

    it('applies the requested page', async () => {
      const result = await service.listPublic({ page: 3, pageSize: 20 });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(20);
      const idQuery = prismaMock.$queryRaw.mock.calls
        .map((call) => call[0])
        .find((sql) => !sqlText(sql).includes('count(*)'))!;
      expect(idQuery.values.slice(-2)).toEqual([20, 40]);
    });

    it('skips hydration when the page is empty', async () => {
      prismaMock.$queryRaw.mockImplementation((sql: Prisma.Sql) =>
        Promise.resolve(sqlText(sql).includes('count(*)') ? [{ count: BigInt(0) }] : []),
      );

      const result = await service.listPublic({ search: 'nothing' });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 10 });
      expect(prismaMock.establishment.findMany).not.toHaveBeenCalled();
    });

    it('returns the public profile with description and nothing else', async () => {
      prismaMock.establishment.findFirst.mockResolvedValue(publicRow());

      const profile = await service.findPublic(7);

      expect(profile).toEqual({
        id: 7,
        name: 'Good Taste',
        image: 'https://api.test/files/users/seven.png',
        description: 'Public description',
        city: 'Birigui',
        state: 'SP',
      });
      expect(Object.keys(profile).sort()).toEqual([
        'city',
        'description',
        'id',
        'image',
        'name',
        'state',
      ]);
    });

    it('falls back to the company name without a trade name', async () => {
      prismaMock.establishment.findFirst.mockResolvedValue(publicRow({ tradeName: null }));

      expect((await service.findPublic(7)).name).toBe('Good Taste Ltd');
    });

    it('looks the profile up only among public institutions', async () => {
      prismaMock.establishment.findFirst.mockResolvedValue(publicRow());

      await service.findPublic(7);

      expect(prismaMock.establishment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7, deleted: false, user: { emailVerified: true } },
        }),
      );
    });

    it('responds not found for a deleted, unconfirmed or missing institution', async () => {
      prismaMock.establishment.findFirst.mockResolvedValue(null);

      await expect(service.findPublic(99)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

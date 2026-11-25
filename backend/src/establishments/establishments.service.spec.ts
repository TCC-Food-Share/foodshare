import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { INSTITUTION_KIND } from '../institutions/institution-kind';
import { InstitutionRegistrationService } from '../institutions/institution-registration.service';
import { publicDuplicateConflict } from '../institutions/institution-uniqueness.service';
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

  const image: ValidatedImage = { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), type: 'png' };

  const storageMock = {
    store: jest.fn<(folder: string, image: ValidatedImage) => Promise<string>>(),
    removeQuietly: jest.fn<(key: string) => Promise<void>>(),
    toUrl: (key: string | null | undefined) => (key ? `https://api.test/files/${key}` : null),
  };

  const registrationMock = {
    register: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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
        { provide: InstitutionRegistrationService, useValue: registrationMock },
        { provide: ImageStorageService, useValue: storageMock },
      ],
    }).compile();

    service = moduleRef.get(EstablishmentsService);
  });

  describe('create and update (delegated to the institution core)', () => {
    const record = {
      id: 30,
      userId: 20,
      addressId: 10,
      companyName: dto.companyName,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      institutionalEmail: dto.institutionalEmail,
      institutionalPhone: dto.institutionalPhone,
      description: dto.description,
      user: {
        id: 20,
        name: dto.name,
        email: dto.email,
        personalPhone: dto.personalPhone,
        image: 'users/new.png',
        password: 'hash',
      },
      address: { id: 10, ...dto.address, complement: null },
    };

    it('registers through the core with the public duplicate message', async () => {
      registrationMock.register.mockResolvedValue(record);

      const result = await service.create(dto, image);

      expect(registrationMock.register).toHaveBeenCalledWith(
        INSTITUTION_KIND.ESTABLISHMENT,
        dto,
        image,
        {
          conflict: publicDuplicateConflict,
        },
      );
      expect(result.id).toBe(30);
      expect(result.user.image).toBe('https://api.test/files/users/new.png');
      expect(JSON.stringify(result)).not.toContain('hash');
    });

    it('updates the establishment of the authenticated user through the core', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(record);
      registrationMock.update.mockResolvedValue({ ...record, description: 'New' });

      const result = await service.update(20, { description: 'New' }, image);

      expect(prismaMock.establishment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 20 } }),
      );
      expect(registrationMock.update).toHaveBeenCalledWith(
        INSTITUTION_KIND.ESTABLISHMENT,
        record,
        { description: 'New' },
        image,
        { conflict: publicDuplicateConflict },
      );
      expect(result.description).toBe('New');
    });

    it('throws NotFoundException when the authenticated user has no establishment', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { description: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(registrationMock.update).not.toHaveBeenCalled();
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

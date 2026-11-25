import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { BETTER_AUTH } from '../auth/better-auth.token';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  INSTITUTION_KIND,
  type InstitutionKind,
  type InstitutionWithRelations,
} from './institution-kind';
import {
  type InstitutionCreateInput,
  InstitutionRegistrationService,
} from './institution-registration.service';
import {
  type InstitutionUniqueField,
  InstitutionUniquenessService,
  publicDuplicateConflict,
} from './institution-uniqueness.service';

type Where = Record<string, unknown>;
type FindFirst = jest.Mock<(args: { where: Where; select?: unknown }) => Promise<unknown>>;

const dto: InstitutionCreateInput = {
  name: 'Test Owner',
  email: 'owner@test.com',
  personalPhone: '18999999999',
  password: 'strong-password',
  companyName: 'Test Institution Ltd',
  tradeName: 'Test Trade',
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

const P2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

const delegate = () => ({
  findFirst: jest.fn<(args: { where: Where; select?: unknown }) => Promise<unknown>>(),
  findUnique: jest.fn<(args: unknown) => Promise<unknown>>(),
  create: jest.fn<(args: unknown) => Promise<unknown>>(),
  update: jest.fn<(args: unknown) => Promise<unknown>>(),
});

describe.each([INSTITUTION_KIND.ESTABLISHMENT, INSTITUTION_KIND.BENEFICIARY_ENTITY])(
  'InstitutionRegistrationService (%s)',
  (kind: InstitutionKind) => {
    const own = kind === INSTITUTION_KIND.ESTABLISHMENT ? 'establishment' : 'beneficiaryEntity';
    const other = own === 'establishment' ? 'beneficiaryEntity' : 'establishment';

    const db = {
      establishment: delegate(),
      beneficiaryEntity: delegate(),
      user: {
        findFirst: jest.fn<(args: { where: Where; select?: unknown }) => Promise<unknown>>(),
        update: jest.fn<(args: unknown) => Promise<unknown>>(),
        delete: jest.fn<(args: unknown) => Promise<unknown>>(),
      },
      address: {
        create: jest.fn<(args: unknown) => Promise<unknown>>(),
        update: jest.fn<(args: unknown) => Promise<unknown>>(),
      },
      verification: { deleteMany: jest.fn<(args: unknown) => Promise<unknown>>() },
      role: { findUniqueOrThrow: jest.fn<(args: unknown) => Promise<unknown>>() },
      $executeRaw: jest.fn<(...args: unknown[]) => Promise<number>>(),
    };

    const storageMock = {
      store: jest.fn<(folder: string, image: ValidatedImage) => Promise<string>>(),
      removeQuietly: jest.fn<(key: string) => Promise<void>>(),
    };

    const authMock = {
      api: {
        signUpEmail: jest.fn<(args: { body: Record<string, unknown> }) => Promise<unknown>>(),
      },
    };

    const conflict = jest.fn((fields: InstitutionUniqueField[]) => publicDuplicateConflict(fields));

    let service: InstitutionRegistrationService;
    let transaction: jest.Mock<(callback: (tx: typeof db) => unknown) => unknown>;

    const created = {
      id: 30,
      userId: 20,
      addressId: 10,
      companyName: dto.companyName,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      institutionalEmail: dto.institutionalEmail,
      institutionalPhone: dto.institutionalPhone,
      description: dto.description,
      deleted: false,
      user: {
        id: 20,
        name: dto.name,
        email: dto.email,
        personalPhone: dto.personalPhone,
        image: 'users/old.png',
      },
      address: { id: 10, ...dto.address, complement: null as string | null },
    } as unknown as InstitutionWithRelations;

    const takenWhen = (mock: FindFirst, field: string) =>
      mock.mockImplementation(({ where }) => Promise.resolve(field in where ? { id: 99 } : null));

    beforeEach(async () => {
      jest.clearAllMocks();
      transaction = jest.fn((callback: (tx: typeof db) => unknown) => callback(db));
      for (const model of [db.establishment, db.beneficiaryEntity, db.user]) {
        model.findFirst.mockResolvedValue(null);
      }
      db[own].create.mockResolvedValue(created);
      db[own].update.mockResolvedValue(created);
      db[own].findUnique.mockResolvedValue(created);
      db.address.create.mockResolvedValue({ id: 10 });
      db.address.update.mockImplementation((args) =>
        Promise.resolve({ id: 10, ...(args as { data: object }).data }),
      );
      db.role.findUniqueOrThrow.mockResolvedValue({ id: 1 });
      db.$executeRaw.mockResolvedValue(1);
      authMock.api.signUpEmail.mockResolvedValue({ token: null, user: { id: '20' } });
      storageMock.store.mockResolvedValue('users/new.png');
      storageMock.removeQuietly.mockResolvedValue(undefined);

      const moduleRef = await Test.createTestingModule({
        providers: [
          InstitutionRegistrationService,
          InstitutionUniquenessService,
          { provide: PrismaService, useValue: { $transaction: transaction, ...db } },
          { provide: BETTER_AUTH, useValue: authMock },
          { provide: ImageStorageService, useValue: storageMock },
        ],
      }).compile();

      service = moduleRef.get(InstitutionRegistrationService);
    });

    describe('register', () => {
      it('creates the user via better-auth and the address and institution in a transaction', async () => {
        const result = await service.register(kind, dto, image, { conflict });

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
        expect(db[own].create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ userId: 20, addressId: 10 }) }),
        );
        expect(db[other].create).not.toHaveBeenCalled();
        expect(result.id).toBe(30);
      });

      it('takes the uniqueness lock and checks again inside the transaction', async () => {
        await service.register(kind, dto, image, { conflict });

        expect(db.$executeRaw).toHaveBeenCalledTimes(1);
      });

      it.each(['cnpj', 'institutionalEmail', 'institutionalPhone'])(
        'refuses a %s already used by an institution of the other kind',
        async (field) => {
          takenWhen(db[other].findFirst, field);

          await expect(service.register(kind, dto, image, { conflict })).rejects.toMatchObject({
            response: { fields: [field] },
          });
          expect(authMock.api.signUpEmail).not.toHaveBeenCalled();
          expect(storageMock.store).not.toHaveBeenCalled();
        },
      );

      it('counts deleted institutions as taken (no deleted filter in the check)', async () => {
        await service.register(kind, dto, image, { conflict });

        for (const call of [
          ...db.establishment.findFirst.mock.calls,
          ...db.beneficiaryEntity.findFirst.mock.calls,
        ]) {
          expect(call[0].where).not.toHaveProperty('deleted');
        }
      });

      it('lists every duplicate field and hides which personal field collided', async () => {
        takenWhen(db[own].findFirst, 'institutionalEmail');
        takenWhen(db.user.findFirst, 'personalPhone');

        await expect(service.register(kind, dto, image, { conflict })).rejects.toMatchObject({
          response: {
            fields: ['institutionalEmail', 'personal'],
          },
        });
      });

      it('passes the real field names to the conflict factory', async () => {
        takenWhen(db.user.findFirst, 'email');

        await expect(service.register(kind, dto, image, { conflict })).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(conflict).toHaveBeenCalledWith(['email']);
      });

      it('compares the personal email ignoring case', async () => {
        await service.register(kind, dto, image, { conflict });

        expect(db.user.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { email: { equals: dto.email, mode: 'insensitive' } },
          }),
        );
      });

      it('rejects a duplicate that shows up after the first check, removing user and image', async () => {
        let calls = 0;
        db[other].findFirst.mockImplementation(({ where }) => {
          if ('cnpj' in where) calls++;
          return Promise.resolve('cnpj' in where && calls > 1 ? { id: 99 } : null);
        });

        await expect(service.register(kind, dto, image, { conflict })).rejects.toMatchObject({
          response: { fields: ['cnpj'] },
        });
        expect(db[own].create).not.toHaveBeenCalled();
        expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 20 } });
        expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
      });

      it('answers a conflict and removes the image when better-auth rejects signUpEmail', async () => {
        authMock.api.signUpEmail.mockRejectedValue(new Error('email already in use'));

        await expect(service.register(kind, dto, image, { conflict })).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(transaction).not.toHaveBeenCalled();
        expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
      });

      it('removes user, codes and image and rethrows other transaction errors', async () => {
        const failure = new Error('connection failure');
        transaction.mockImplementation(() => {
          throw failure;
        });

        await expect(service.register(kind, dto, image, { conflict })).rejects.toBe(failure);
        expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 20 } });
        expect(db.verification.deleteMany).toHaveBeenCalled();
        expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
      });

      it('turns a P2002 in the transaction into a conflict', async () => {
        transaction.mockImplementation(() => {
          throw P2002();
        });

        await expect(service.register(kind, dto, image, { conflict })).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(db.user.delete).toHaveBeenCalled();
      });

      it('runs the inTransaction hook with the created institution, inside the transaction', async () => {
        const inTransaction = jest.fn<(tx: unknown, institution: unknown) => Promise<void>>();
        inTransaction.mockResolvedValue(undefined);

        await service.register(kind, dto, image, { conflict, inTransaction });

        expect(inTransaction).toHaveBeenCalledWith(db, created);
      });

      it('undoes the account when the inTransaction hook fails', async () => {
        const inTransaction = jest
          .fn<(tx: unknown, institution: unknown) => Promise<void>>()
          .mockRejectedValue(new Error('audit failure'));

        await expect(
          service.register(kind, dto, image, { conflict, inTransaction }),
        ).rejects.toThrow('audit failure');
        expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 20 } });
        expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
      });
    });

    describe('update', () => {
      it('writes only the field that changed and reports it', async () => {
        const afterUpdate =
          jest.fn<(tx: unknown, changes: unknown, updated: unknown) => Promise<void>>();
        afterUpdate.mockResolvedValue(undefined);

        await service.update(kind, created, { description: 'New', name: dto.name }, undefined, {
          conflict,
          afterUpdate,
        });

        expect(db.user.update).not.toHaveBeenCalled();
        expect(db.address.update).not.toHaveBeenCalled();
        expect(db[own].update).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 30 }, data: { description: 'New' } }),
        );
        expect(afterUpdate).toHaveBeenCalledWith(
          db,
          { before: { description: dto.description }, after: { description: 'New' } },
          created,
        );
      });

      it('saves the responsible name and phone on the user', async () => {
        await service.update(
          kind,
          created,
          { name: 'Ana', personalPhone: '18911112222' },
          undefined,
          {
            conflict,
          },
        );

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 20 },
          data: { name: 'Ana', personalPhone: '18911112222' },
        });
      });

      it('clears the trade name when it comes as null (DT40)', async () => {
        await service.update(kind, created, { tradeName: null }, undefined, { conflict });

        expect(db[own].update).toHaveBeenCalledWith(
          expect.objectContaining({ data: { tradeName: null } }),
        );
      });

      it('reports no change when nothing differs', async () => {
        const afterUpdate =
          jest.fn<(tx: unknown, changes: unknown, updated: unknown) => Promise<void>>();
        afterUpdate.mockResolvedValue(undefined);

        await service.update(kind, created, { description: dto.description }, undefined, {
          conflict,
          afterUpdate,
        });

        expect(db[own].update).not.toHaveBeenCalled();
        expect(afterUpdate).toHaveBeenCalledWith(db, null, created);
      });

      it('updates the address as a unit when it changes', async () => {
        await service.update(
          kind,
          created,
          { address: { ...dto.address, number: '999' } },
          undefined,
          {
            conflict,
          },
        );

        expect(db.address.update).toHaveBeenCalledWith({
          where: { id: 10 },
          data: expect.objectContaining({ number: '999', street: dto.address.street }),
        });
      });

      it('refuses an institutional email of the other kind, without writing', async () => {
        takenWhen(db[other].findFirst, 'institutionalEmail');

        await expect(
          service.update(kind, created, { institutionalEmail: 'x@test.com' }, image, { conflict }),
        ).rejects.toMatchObject({ response: { fields: ['institutionalEmail'] } });
        expect(storageMock.store).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
      });

      it('excludes only the institution itself, in its own table', async () => {
        await service.update(kind, created, { institutionalEmail: 'x@test.com' }, undefined, {
          conflict,
        });

        expect(db[own].findFirst).toHaveBeenCalledWith({
          where: { institutionalEmail: 'x@test.com', id: { not: 30 } },
          select: { id: true },
        });
        expect(db[other].findFirst).toHaveBeenCalledWith({
          where: { institutionalEmail: 'x@test.com' },
          select: { id: true },
        });
      });

      it('takes the uniqueness lock only when an institutional field is sent', async () => {
        await service.update(kind, created, { description: 'New' }, undefined, { conflict });
        expect(db.$executeRaw).not.toHaveBeenCalled();

        await service.update(kind, created, { institutionalPhone: '18900001111' }, undefined, {
          conflict,
        });
        expect(db.$executeRaw).toHaveBeenCalledTimes(1);
      });

      it('swaps the image and removes the previous one after the commit', async () => {
        await service.update(kind, created, {}, image, { conflict });

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 20 },
          data: { image: 'users/new.png' },
        });
        expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/old.png');
        expect(storageMock.removeQuietly).not.toHaveBeenCalledWith('users/new.png');
      });

      it('removes nothing when a registration without image gets its first one', async () => {
        db[own].findUnique.mockResolvedValue({
          ...created,
          user: { ...created.user, image: null },
        });

        await service.update(kind, created, {}, image, { conflict });

        expect(storageMock.removeQuietly).not.toHaveBeenCalled();
      });

      it('keeps the previous image and removes the new one when the update fails', async () => {
        db[own].update.mockRejectedValue(P2002());

        await expect(
          service.update(kind, created, { institutionalPhone: '18977777777' }, image, { conflict }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(storageMock.removeQuietly).toHaveBeenCalledWith('users/new.png');
        expect(storageMock.removeQuietly).not.toHaveBeenCalledWith('users/old.png');
      });

      it('runs beforeUpdate first, inside the transaction', async () => {
        const order: string[] = [];
        db[own].update.mockImplementation(() => {
          order.push('update');
          return Promise.resolve(created);
        });

        await service.update(kind, created, { description: 'New' }, undefined, {
          conflict,
          beforeUpdate: () => {
            order.push('before');
            return Promise.resolve();
          },
        });

        expect(order).toEqual(['before', 'update']);
      });
    });
  },
);

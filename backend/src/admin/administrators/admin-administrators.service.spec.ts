import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { AuditService } from '../../audit/audit.service';
import type { BetterAuthInstance } from '../../auth/better-auth.token';
import type { ValidatedImage } from '../../files/image-file.pipe';
import type { ImageStorageService } from '../../files/image-storage.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminAdministratorsService } from './admin-administrators.service';
import {
  CANNOT_DELETE_SELF,
  EMAIL_ALREADY_REGISTERED,
  LAST_ADMINISTRATOR,
} from './administrator.errors';

type Fn = (...args: unknown[]) => Promise<unknown>;
const fn = () => jest.fn<Fn>();

const actor = { id: 1, name: 'Admin', email: 'admin@example.com' };
const image = { buffer: Buffer.from('img'), mimeType: 'image/png' } as unknown as ValidatedImage;

const adminRow = (overrides: object = {}) => ({
  id: 7,
  name: 'Ana Lima',
  email: 'ana@example.com',
  image: 'users/old.png',
  emailVerified: true,
  ...overrides,
});

const sqlText = (args: unknown[]) => (args[0] as readonly string[]).join('?');

describe('AdminAdministratorsService', () => {
  const tx = {
    user: {
      findMany: fn(),
      findFirst: fn(),
      findUniqueOrThrow: fn(),
      update: fn(),
      delete: fn(),
    },
    role: { findUniqueOrThrow: fn() },
    verification: { deleteMany: fn() },
    auditLog: { create: fn() },
    $queryRaw: fn(),
  };
  const transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (client: typeof tx) => Promise<unknown>)(tx)
      : Promise.all(arg as Promise<unknown>[]),
  );
  const prisma = { ...tx, $transaction: transaction } as unknown as PrismaService;

  const signUpEmail = fn();
  const auth = { api: { signUpEmail } } as unknown as BetterAuthInstance;

  const store = fn();
  const removeQuietly = fn();
  const storage = {
    store,
    removeQuietly,
    toUrl: (key: string | null) => (key ? `http://api/files/${key}` : null),
  } as unknown as ImageStorageService;

  const audit = new AuditService();
  const record = jest.spyOn(audit, 'record');

  const service = new AdminAdministratorsService(prisma, auth, storage, audit);

  const conflictCode = async (promise: Promise<unknown>) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    return ((error as ConflictException).getResponse() as { code: string }).code;
  };

  let emailOwners: { email: string; id: number }[];

  beforeEach(() => {
    jest.clearAllMocks();
    emailOwners = [];
    tx.user.findFirst.mockImplementation((args) => {
      const where = (args as { where: Record<string, unknown> }).where;
      if ('role' in where) return Promise.resolve(where.id === 7 ? adminRow() : null);
      const email = (where.email as { equals: string }).equals.toLowerCase();
      const exceptId = (where.id as { not: number } | undefined)?.not;
      const owner = emailOwners.find((o) => o.email === email && o.id !== exceptId);
      return Promise.resolve(owner ? { id: owner.id } : null);
    });
    tx.role.findUniqueOrThrow.mockResolvedValue({ id: 3, name: 'Administrator' });
    tx.user.findUniqueOrThrow.mockResolvedValue(
      adminRow({ id: 9, email: 'novo@example.com', image: 'users/new.png', emailVerified: false }),
    );
    tx.user.update.mockImplementation((args) =>
      Promise.resolve({ ...adminRow(), ...(args as { data: object }).data }),
    );
    tx.auditLog.create.mockResolvedValue({});
    store.mockResolvedValue('users/new.png');
    signUpEmail.mockResolvedValue({ user: { id: '9' } });
  });

  describe('list (RF32)', () => {
    beforeEach(() => {
      tx.user.findMany.mockResolvedValue([
        adminRow({ id: 1, name: 'Admin Seed', email: 'seed@foodshare.com.br' }),
        adminRow({ id: 7, name: 'João Souza', email: 'joao@example.com', emailVerified: false }),
        adminRow({ id: 17, name: 'Maria', email: 'maria@foodshare.com.br' }),
        adminRow({ id: 27, name: 'Paulo', email: 'paulo7@example.com' }),
      ]);
    });

    it('queries only administrators and reports the confirmation state', async () => {
      const result = await service.list({});

      expect(tx.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: { name: 'Administrator' } } }),
      );
      expect(result.total).toBe(4);
      expect(result.data[1]).toEqual({
        id: 7,
        name: 'João Souza',
        email: 'joao@example.com',
        image: 'http://api/files/users/old.png',
        emailVerified: false,
      });
    });

    it('searches the name without accents, the email and the exact id', async () => {
      expect((await service.list({ search: 'joao' })).data.map((a) => a.id)).toEqual([7]);
      expect((await service.list({ search: '@foodshare' })).data.map((a) => a.id)).toEqual([1, 17]);
      // Id exato (7) ou trecho do texto (paulo7); o 17 não casa.
      expect((await service.list({ search: '7' })).data.map((a) => a.id)).toEqual([7, 27]);
    });

    it('sorts by email descending', async () => {
      const result = await service.list({ sort: 'email', order: 'desc' });
      expect(result.data.map((a) => a.email)).toEqual([
        'seed@foodshare.com.br',
        'paulo7@example.com',
        'maria@foodshare.com.br',
        'joao@example.com',
      ]);
    });
  });

  describe('create (RF29)', () => {
    const dto = { name: 'Novo Admin', email: 'novo@example.com', password: 'secret1234' };

    it('signs up an unconfirmed administrator with the image and audits without the password', async () => {
      const result = await service.create(actor, dto, image);

      expect(signUpEmail).toHaveBeenCalledWith({
        body: { ...dto, image: 'users/new.png', roleId: 3 },
      });
      expect(result).toEqual({
        id: 9,
        name: 'Ana Lima',
        email: 'novo@example.com',
        image: 'http://api/files/users/new.png',
        emailVerified: false,
      });
      expect(record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'administrator.create',
          entityType: 'User',
          entityId: 9,
        }),
      );
      expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain('secret1234');
      expect(removeQuietly).not.toHaveBeenCalled();
    });

    it('refuses an email already used by any user without storing the image', async () => {
      emailOwners = [{ email: 'novo@example.com', id: 30 }];

      expect(await conflictCode(service.create(actor, dto, image))).toBe(EMAIL_ALREADY_REGISTERED);
      expect(store).not.toHaveBeenCalled();
      expect(signUpEmail).not.toHaveBeenCalled();
    });

    it('maps a sign-up race on the email to 409 and removes the image', async () => {
      signUpEmail.mockImplementation(() => {
        emailOwners = [{ email: 'novo@example.com', id: 31 }];
        return Promise.reject(new Error('USER_ALREADY_EXISTS'));
      });

      expect(await conflictCode(service.create(actor, dto, image))).toBe(EMAIL_ALREADY_REGISTERED);
      expect(removeQuietly).toHaveBeenCalledWith('users/new.png');
    });

    it('discards the account and the image when the audit fails', async () => {
      tx.auditLog.create.mockRejectedValue(new Error('audit down'));

      await expect(service.create(actor, dto, image)).rejects.toThrow('audit down');
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 9 } });
      expect(tx.verification.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: {
            in: ['email-verification-otp-novo@example.com', 'forget-password-otp-novo@example.com'],
          },
        },
      });
      expect(removeQuietly).toHaveBeenCalledWith('users/new.png');
    });
  });

  describe('update (RF30, DT47)', () => {
    it('changes only the name and audits before and after', async () => {
      const result = await service.update(actor, 7, { name: 'Ana Paula Lima' });

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 }, data: { name: 'Ana Paula Lima' } }),
      );
      expect(result.name).toBe('Ana Paula Lima');
      expect(result.email).toBe('ana@example.com');
      expect(record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'administrator.update',
          entityId: 7,
          details: { before: { name: 'Ana Lima' }, after: { name: 'Ana Paula Lima' } },
        }),
      );
      expect(tx.verification.deleteMany).not.toHaveBeenCalled();
    });

    it('changes the email without touching the confirmation and clears codes of the old one', async () => {
      await service.update(actor, 7, { email: 'ana.lima@example.com' });

      const { data } = tx.user.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).toEqual({ email: 'ana.lima@example.com' });
      expect(tx.verification.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: {
            in: ['email-verification-otp-ana@example.com', 'forget-password-otp-ana@example.com'],
          },
        },
      });
    });

    it('allows keeping the own email and writes nothing when nothing changed', async () => {
      await service.update(actor, 7, { name: 'Ana Lima', email: 'ana@example.com' });

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('refuses the email of another user', async () => {
      emailOwners = [{ email: 'entidade@example.com', id: 30 }];

      expect(await conflictCode(service.update(actor, 7, { email: 'entidade@example.com' }))).toBe(
        EMAIL_ALREADY_REGISTERED,
      );
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('maps a unique violation on the update to EMAIL_ALREADY_REGISTERED', async () => {
      tx.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );

      expect(await conflictCode(service.update(actor, 7, { email: 'x@example.com' }))).toBe(
        EMAIL_ALREADY_REGISTERED,
      );
    });

    it('removes the previous image only after the commit', async () => {
      const result = await service.update(actor, 7, {}, image);

      expect(result.image).toBe('http://api/files/users/new.png');
      expect(removeQuietly).toHaveBeenCalledWith('users/old.png');
      expect(removeQuietly.mock.invocationCallOrder[0]).toBeGreaterThan(
        tx.auditLog.create.mock.invocationCallOrder[0],
      );
    });

    it('removes the new image when the update fails', async () => {
      tx.auditLog.create.mockRejectedValue(new Error('audit down'));

      await expect(service.update(actor, 7, {}, image)).rejects.toThrow('audit down');
      expect(removeQuietly).toHaveBeenCalledWith('users/new.png');
      expect(removeQuietly).not.toHaveBeenCalledWith('users/old.png');
    });

    it('answers 404 for an id that is not an administrator', async () => {
      await expect(service.update(actor, 30, { name: 'X' }, image)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(removeQuietly).toHaveBeenCalledWith('users/new.png');
    });
  });

  describe('remove (RF31, RN34, DT46)', () => {
    const useAdministrators = (rows: object[]) => tx.$queryRaw.mockResolvedValue(rows);

    it('locks every administrator, deletes the target with its codes and removes the image after the commit', async () => {
      useAdministrators([adminRow({ id: 1, image: null }), adminRow()]);

      await service.remove(actor, 7);

      const sql = sqlText(tx.$queryRaw.mock.calls[0]);
      expect(sql).toContain('ORDER BY u.id');
      expect(sql).toContain('FOR UPDATE OF u');
      expect(tx.verification.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: {
            in: ['email-verification-otp-ana@example.com', 'forget-password-otp-ana@example.com'],
          },
        },
      });
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'administrator.delete',
          entityId: 7,
          details: { name: 'Ana Lima', email: 'ana@example.com' },
        }),
      );
      expect(removeQuietly).toHaveBeenCalledWith('users/old.png');
      expect(removeQuietly.mock.invocationCallOrder[0]).toBeGreaterThan(
        tx.auditLog.create.mock.invocationCallOrder[0],
      );
    });

    it('refuses deleting the own account before opening the transaction', async () => {
      expect(await conflictCode(service.remove(actor, 1))).toBe(CANNOT_DELETE_SELF);
      expect(transaction).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('refuses when no confirmed administrator would remain (crossed deletion)', async () => {
      // A outra exclusão já apagou o ator: sob a trava só sobra o alvo.
      useAdministrators([adminRow()]);

      expect(await conflictCode(service.remove(actor, 7))).toBe(LAST_ADMINISTRATOR);
      expect(tx.user.delete).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
      expect(removeQuietly).not.toHaveBeenCalled();
    });

    it('does not count unconfirmed administrators as remaining', async () => {
      useAdministrators([adminRow({ id: 9, emailVerified: false }), adminRow()]);

      expect(await conflictCode(service.remove(actor, 7))).toBe(LAST_ADMINISTRATOR);
    });

    it('deletes an unconfirmed administrator', async () => {
      useAdministrators([adminRow({ id: 1 }), adminRow({ emailVerified: false })]);

      await service.remove(actor, 7);
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    it('answers 404 when the id is not an administrator', async () => {
      useAdministrators([adminRow({ id: 1 }), adminRow()]);

      await expect(service.remove(actor, 30)).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.user.delete).not.toHaveBeenCalled();
    });
  });
});

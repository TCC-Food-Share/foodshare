import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { UNVERIFIED_ACCOUNTS_CLEANUP_JOB } from './jobs.constants';
import { JobsService } from './jobs.service';
import { UnverifiedAccountsCleanupService } from './unverified-accounts-cleanup.service';

type AnyFn = (...args: any[]) => any;

const NOW = new Date('2026-11-11T12:00:00.000Z');

function createMocks() {
  const tx = {
    $queryRaw: jest.fn<AnyFn>(),
    establishment: { findUnique: jest.fn<AnyFn>(), delete: jest.fn<AnyFn>() },
    beneficiaryEntity: { findUnique: jest.fn<AnyFn>(), delete: jest.fn<AnyFn>() },
    address: { delete: jest.fn<AnyFn>() },
    verification: { deleteMany: jest.fn<AnyFn>() },
    user: { delete: jest.fn<AnyFn>() },
  };
  const prisma = {
    user: { findMany: jest.fn<AnyFn>() },
    $transaction: jest.fn<AnyFn>((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const storage = { removeQuietly: jest.fn<AnyFn>() };
  return { tx, prisma, storage };
}

describe('UnverifiedAccountsCleanupService', () => {
  let mocks: ReturnType<typeof createMocks>;
  let jobs: JobsService;
  let service: UnverifiedAccountsCleanupService;

  beforeEach(() => {
    mocks = createMocks();
    jobs = new JobsService();
    service = new UnverifiedAccountsCleanupService(
      mocks.prisma as unknown as PrismaService,
      mocks.storage as unknown as ImageStorageService,
      jobs,
    );
    mocks.tx.$queryRaw.mockResolvedValue([{ id: 1 }]);
    mocks.tx.establishment.findUnique.mockResolvedValue(null);
    mocks.tx.beneficiaryEntity.findUnique.mockResolvedValue(null);
  });

  it('busca só contas não confirmadas criadas há mais de 24 horas', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([]);

    await service.run(NOW);

    expect(mocks.prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          emailVerified: false,
          createdAt: { lt: new Date('2026-11-10T12:00:00.000Z') },
        },
      }),
    );
  });

  it('apaga o estabelecimento, o endereço, os códigos e o usuário, e a imagem depois do commit', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([
      { id: 1, email: 'a@a.com', image: 'users/a.webp' },
    ]);
    mocks.tx.establishment.findUnique.mockResolvedValue({ id: 10, addressId: 20 });
    const order: string[] = [];
    mocks.tx.user.delete.mockImplementation(() => order.push('user.delete'));
    mocks.storage.removeQuietly.mockImplementation(() => order.push('image'));

    const result = await service.run(NOW);

    expect(result).toEqual({ affected: 1 });
    expect(mocks.tx.establishment.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(mocks.tx.address.delete).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(mocks.tx.verification.deleteMany).toHaveBeenCalledWith({
      where: {
        identifier: { in: ['email-verification-otp-a@a.com', 'forget-password-otp-a@a.com'] },
      },
    });
    expect(mocks.tx.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mocks.storage.removeQuietly).toHaveBeenCalledWith('users/a.webp');
    expect(order).toEqual(['user.delete', 'image']);
  });

  it('apaga a entidade beneficiária e o endereço dela', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([{ id: 2, email: 'b@b.com', image: null }]);
    mocks.tx.beneficiaryEntity.findUnique.mockResolvedValue({ id: 30, addressId: 40 });

    const result = await service.run(NOW);

    expect(result).toEqual({ affected: 1 });
    expect(mocks.tx.beneficiaryEntity.delete).toHaveBeenCalledWith({ where: { id: 30 } });
    expect(mocks.tx.address.delete).toHaveBeenCalledWith({ where: { id: 40 } });
    expect(mocks.tx.establishment.delete).not.toHaveBeenCalled();
    expect(mocks.storage.removeQuietly).not.toHaveBeenCalled();
  });

  it('mantém a conta confirmada entre a busca e a exclusão', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([
      { id: 1, email: 'a@a.com', image: 'users/a.webp' },
    ]);
    mocks.tx.$queryRaw.mockResolvedValue([]);

    const result = await service.run(NOW);

    expect(result).toEqual({ affected: 0 });
    expect(mocks.tx.user.delete).not.toHaveBeenCalled();
    expect(mocks.tx.establishment.findUnique).not.toHaveBeenCalled();
    expect(mocks.storage.removeQuietly).not.toHaveBeenCalled();
  });

  it('erro em uma conta não impede as outras', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([
      { id: 1, email: 'a@a.com', image: 'users/a.webp' },
      { id: 2, email: 'b@b.com', image: 'users/b.webp' },
    ]);
    mocks.tx.user.delete.mockImplementation((args: { where: { id: number } }) => {
      if (args.where.id === 1) throw new Error('foreign key');
      return {};
    });

    const result = await service.run(NOW);

    expect(result).toEqual({ affected: 1 });
    expect(mocks.storage.removeQuietly).toHaveBeenCalledTimes(1);
    expect(mocks.storage.removeQuietly).toHaveBeenCalledWith('users/b.webp');
  });

  it('se registra no JobsService para a execução manual', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([]);
    service.onModuleInit();

    await expect(jobs.run(UNVERIFIED_ACCOUNTS_CLEANUP_JOB)).resolves.toEqual({ affected: 0 });
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AllowAnonymous: () => () => undefined,
  Session: () => () => undefined,
}));

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const queryRaw = jest.fn<() => Promise<unknown>>();
  const roleFindUnique = jest.fn<(args: { where: { id: number } }) => Promise<unknown>>();
  const prismaMock = { $queryRaw: queryRaw, role: { findUnique: roleFindUnique } };

  beforeEach(async () => {
    queryRaw.mockReset();
    roleFindUnique.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('me', () => {
    const session = { user: { id: 1, email: 'a@b.com', roleId: 2 } } as never;

    it('returns the session user with the resolved role name', async () => {
      roleFindUnique.mockResolvedValue({ id: 2, name: 'BeneficiaryEntity' });

      await expect(appController.getMe(session)).resolves.toEqual({
        user: { id: 1, email: 'a@b.com', roleId: 2 },
        role: 'BeneficiaryEntity',
      });
      expect(roleFindUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    });

    it('returns role null when the role id has no match', async () => {
      roleFindUnique.mockResolvedValue(null);

      await expect(appController.getMe(session)).resolves.toEqual({
        user: { id: 1, email: 'a@b.com', roleId: 2 },
        role: null,
      });
    });
  });

  describe('health', () => {
    it('returns ok when the database is reachable', async () => {
      queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await expect(appController.getHealth()).resolves.toEqual({ status: 'ok' });
    });

    it('throws when the database is unreachable', async () => {
      queryRaw.mockRejectedValue(new Error('connection refused'));

      await expect(appController.getHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});

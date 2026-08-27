import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServiceUnavailableException, SetMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AllowAnonymous: () => SetMetadata('PUBLIC', true),
  AuthService: class AuthService {},
  Session: () => () => undefined,
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(() => new Headers()),
}));

import { AuthService } from '@thallesp/nestjs-better-auth';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const queryRaw = jest.fn<() => Promise<unknown>>();
  const prismaMock = { $queryRaw: queryRaw };
  const signOut = jest.fn<(args: { headers: Headers }) => Promise<unknown>>();
  const authServiceMock = { api: { signOut } };

  beforeEach(async () => {
    queryRaw.mockReset();
    signOut.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
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

  describe('logout', () => {
    it('calls auth.api.signOut with the request headers and returns success', async () => {
      signOut.mockResolvedValue({ success: true });
      const request = { headers: { cookie: 'better-auth.session_token=abc' } } as never;

      await expect(appController.logout(request)).resolves.toEqual({ success: true });
      expect(signOut).toHaveBeenCalledWith({ headers: expect.any(Headers) });
    });

    it('propagates errors thrown by auth.api.signOut', async () => {
      signOut.mockRejectedValue(new Error('no active session'));
      const request = { headers: {} } as never;

      await expect(appController.logout(request)).rejects.toThrow('no active session');
    });

    it('is not decorated with @AllowAnonymous (guard applies)', () => {
      const isPublic = Reflect.getMetadata('PUBLIC', AppController.prototype.logout);

      expect(isPublic).toBeUndefined();
    });

    it('sanity check: @AllowAnonymous does set the PUBLIC metadata (control for the test above)', () => {
      const isPublic = Reflect.getMetadata('PUBLIC', AppController.prototype.getHello);

      expect(isPublic).toBe(true);
    });
  });
});

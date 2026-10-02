import { beforeEach, describe, expect, it, jest } from '@jest/globals';

class MockAPIError extends Error {
  status: string;
  body: unknown;

  constructor(status: string, body: unknown) {
    super(status);
    this.status = status;
    this.body = body;
  }

  static from(status: string, body: unknown) {
    return new MockAPIError(status, body);
  }
}

jest.mock('better-auth', () => ({
  APIError: MockAPIError,
  BASE_ERROR_CODES: {
    INVALID_EMAIL_OR_PASSWORD: {
      message: 'Invalid email or password',
      code: 'INVALID_EMAIL_OR_PASSWORD',
    },
  },
}));

import { APIError } from 'better-auth';

import { rejectDeletedUserOnSignIn } from './reject-deleted-user.hook';

describe('rejectDeletedUserOnSignIn', () => {
  const findUnique =
    jest.fn<(args: { where: { email: string } }) => Promise<{ deleted: boolean } | null>>();
  const prisma = { user: { findUnique } };

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('rejeita quando o usuário está marcado como deleted', async () => {
    findUnique.mockResolvedValue({ deleted: true });

    await expect(
      rejectDeletedUserOnSignIn({ path: '/sign-in/email', body: { email: 'a@a.com' } }, prisma),
    ).rejects.toBeInstanceOf(APIError);
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'a@a.com' } });
  });

  it('não interfere quando o path não é /sign-in/email', async () => {
    await expect(
      rejectDeletedUserOnSignIn({ path: '/sign-up/email', body: { email: 'a@a.com' } }, prisma),
    ).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('não bloqueia quando o usuário não está deleted', async () => {
    findUnique.mockResolvedValue({ deleted: false });

    await expect(
      rejectDeletedUserOnSignIn({ path: '/sign-in/email', body: { email: 'a@a.com' } }, prisma),
    ).resolves.toBeUndefined();
  });

  it('não bloqueia quando o usuário não é encontrado', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      rejectDeletedUserOnSignIn(
        { path: '/sign-in/email', body: { email: 'nao@existe.com' } },
        prisma,
      ),
    ).resolves.toBeUndefined();
  });

  it('usa a mesma mensagem genérica de credencial inválida do better-auth', async () => {
    findUnique.mockResolvedValue({ deleted: true });

    await expect(
      rejectDeletedUserOnSignIn({ path: '/sign-in/email', body: { email: 'a@a.com' } }, prisma),
    ).rejects.toMatchObject({
      body: { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
    });
  });
});

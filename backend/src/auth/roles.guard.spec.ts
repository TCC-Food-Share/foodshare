import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLE, ROLE_NOT_ALLOWED, type RoleName } from './roles.constants';
import { RolesGuard } from './roles.guard';
import { RolesService } from './roles.service';

const ROLE_NAMES_BY_ID: Record<number, string> = {
  1: ROLE.ESTABLISHMENT,
  2: ROLE.BENEFICIARY_ENTITY,
  3: ROLE.ADMINISTRATOR,
};

function contextFor(user: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn<(...args: unknown[]) => RoleName[] | undefined>();
  const nameOf = jest.fn((roleId: number) => Promise.resolve(ROLE_NAMES_BY_ID[roleId]));
  let guard: RolesGuard;

  beforeEach(() => {
    getAllAndOverride.mockReset();
    guard = new RolesGuard(
      { getAllAndOverride } as unknown as Reflector,
      { nameOf } as unknown as RolesService,
    );
  });

  it('allows any authenticated user when no role is required', async () => {
    getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(contextFor({ roleId: 1 }))).resolves.toBe(true);
  });

  it('allows the administrator on administrator-only routes', async () => {
    getAllAndOverride.mockReturnValue([ROLE.ADMINISTRATOR]);
    await expect(guard.canActivate(contextFor({ roleId: 3 }))).resolves.toBe(true);
  });

  it.each([1, 2])('rejects institution role %i on administrator-only routes', async (roleId) => {
    getAllAndOverride.mockReturnValue([ROLE.ADMINISTRATOR]);
    await expect(guard.canActivate(contextFor({ roleId }))).rejects.toMatchObject({
      response: { code: ROLE_NOT_ALLOWED },
    });
  });

  it.each([1, 2])('allows institution role %i on institution routes', async (roleId) => {
    getAllAndOverride.mockReturnValue([ROLE.ESTABLISHMENT, ROLE.BENEFICIARY_ENTITY]);
    await expect(guard.canActivate(contextFor({ roleId }))).resolves.toBe(true);
  });

  it('rejects the administrator on institution routes', async () => {
    getAllAndOverride.mockReturnValue([ROLE.ESTABLISHMENT, ROLE.BENEFICIARY_ENTITY]);
    await expect(guard.canActivate(contextFor({ roleId: 3 }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a session user without roleId', async () => {
    getAllAndOverride.mockReturnValue([ROLE.ADMINISTRATOR]);
    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(contextFor(null))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

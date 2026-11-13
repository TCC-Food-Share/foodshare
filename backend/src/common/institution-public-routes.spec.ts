import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AllowAnonymous: () => () => undefined,
  Session: () => () => undefined,
}));

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { ROLE } from '../auth/roles.constants';
import { ROLES_KEY } from '../auth/roles.guard';
import { BeneficiaryEntitiesController } from '../beneficiary-entities/beneficiary-entities.controller';
import { EstablishmentsController } from '../establishments/establishments.controller';

type Handler = (...args: never[]) => unknown;

const rolesOf = (handler: Handler): unknown => Reflect.getMetadata(ROLES_KEY, handler);

const getRoutesInOrder = (prototype: object): string[] =>
  Object.getOwnPropertyNames(prototype)
    .map((name) => (prototype as Record<string, Handler>)[name])
    .filter((handler) => Reflect.getMetadata(METHOD_METADATA, handler) === RequestMethod.GET)
    .map((handler) => String(Reflect.getMetadata(PATH_METADATA, handler)));

describe('public institution routes', () => {
  it('lets only beneficiary entities list and open establishments', () => {
    const { prototype } = EstablishmentsController;

    expect(rolesOf(prototype.listPublic)).toEqual([ROLE.BENEFICIARY_ENTITY]);
    expect(rolesOf(prototype.findPublic)).toEqual([ROLE.BENEFICIARY_ENTITY]);
  });

  it('lets only establishments list and open beneficiary entities', () => {
    const { prototype } = BeneficiaryEntitiesController;

    expect(rolesOf(prototype.listPublic)).toEqual([ROLE.ESTABLISHMENT]);
    expect(rolesOf(prototype.findPublic)).toEqual([ROLE.ESTABLISHMENT]);
  });

  it.each([EstablishmentsController, BeneficiaryEntitiesController])(
    'declares GET me before GET :id in %p',
    (controller) => {
      const routes = getRoutesInOrder(controller.prototype);

      expect(routes.indexOf('me')).toBeGreaterThanOrEqual(0);
      expect(routes.indexOf('me')).toBeLessThan(routes.indexOf(':id'));
    },
  );
});

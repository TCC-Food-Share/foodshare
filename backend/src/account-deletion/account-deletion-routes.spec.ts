import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AllowAnonymous: () => () => undefined,
  Session: () => () => undefined,
}));

import { BadRequestException, HttpStatus, RequestMethod, ValidationPipe } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { ROLE } from '../auth/roles.constants';
import { ROLES_KEY } from '../auth/roles.guard';
import { BeneficiaryEntitiesController } from '../beneficiary-entities/beneficiary-entities.controller';
import { EstablishmentsController } from '../establishments/establishments.controller';
import { DeleteAccountDto } from './dto/delete-account.dto';

type Handler = (...args: never[]) => unknown;

const meta = (key: string, handler: Handler): unknown => Reflect.getMetadata(key, handler);

const getRoutesInOrder = (prototype: object): string[] =>
  Object.getOwnPropertyNames(prototype)
    .map((name) => (prototype as Record<string, Handler>)[name])
    .filter((handler) => meta(METHOD_METADATA, handler) === RequestMethod.GET)
    .map((handler) => String(meta(PATH_METADATA, handler)));

describe('own account deletion routes', () => {
  it.each([EstablishmentsController, BeneficiaryEntitiesController])(
    'exposes GET me/deletion-impact and DELETE me (204) to institutions in %p',
    (controller) => {
      const { prototype } = controller;
      const institutions = [ROLE.ESTABLISHMENT, ROLE.BENEFICIARY_ENTITY];

      expect(meta(PATH_METADATA, prototype.deletionImpact)).toBe('me/deletion-impact');
      expect(meta(METHOD_METADATA, prototype.deletionImpact)).toBe(RequestMethod.GET);
      expect(meta(ROLES_KEY, prototype.deletionImpact)).toEqual(institutions);

      expect(meta(PATH_METADATA, prototype.deleteMe)).toBe('me');
      expect(meta(METHOD_METADATA, prototype.deleteMe)).toBe(RequestMethod.DELETE);
      expect(meta(HTTP_CODE_METADATA, prototype.deleteMe)).toBe(HttpStatus.NO_CONTENT);
      expect(meta(ROLES_KEY, prototype.deleteMe)).toEqual(institutions);
    },
  );

  it.each([EstablishmentsController, BeneficiaryEntitiesController])(
    'declares GET me/deletion-impact before GET :id in %p',
    (controller) => {
      const routes = getRoutesInOrder(controller.prototype);

      expect(routes.indexOf('me/deletion-impact')).toBeGreaterThanOrEqual(0);
      expect(routes.indexOf('me/deletion-impact')).toBeLessThan(routes.indexOf(':id'));
    },
  );

  describe('DeleteAccountDto', () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });
    const run = (body: unknown) =>
      pipe.transform(body, { type: 'body', metatype: DeleteAccountDto });

    it('accepts the password', async () => {
      await expect(run({ password: 'secret' })).resolves.toEqual({ password: 'secret' });
    });

    it.each([
      ['no body', undefined],
      ['an empty password', { password: '' }],
      ['a password that is not text', { password: 123 }],
      ['an extra field', { password: 'secret', confirmation: 'EXCLUIR' }],
    ])('refuses %s with 400', async (_label, body) => {
      await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

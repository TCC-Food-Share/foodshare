import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  Session: () => () => undefined,
}));

import { BadRequestException, HttpStatus, RequestMethod, ValidationPipe } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { ROLE } from '../../auth/roles.constants';
import { ROLES_KEY } from '../../auth/roles.guard';
import { AdminAdministratorsController } from './admin-administrators.controller';
import {
  CreateAdministratorDto,
  ListAdministratorsQueryDto,
  UpdateAdministratorDto,
} from './administrator.dto';

type Handler = (...args: never[]) => unknown;
const meta = (key: string, target: object): unknown => Reflect.getMetadata(key, target);

describe('admin administrators routes', () => {
  const { prototype } = AdminAdministratorsController;

  it('lives under /admin/administrators and requires the Administrator role', () => {
    expect(meta(PATH_METADATA, AdminAdministratorsController)).toBe('admin/administrators');
    expect(meta(ROLES_KEY, AdminAdministratorsController)).toEqual([ROLE.ADMINISTRATOR]);
  });

  it('exposes list, create, update and delete (204)', () => {
    const route = (handler: Handler) => [
      meta(METHOD_METADATA, handler),
      meta(PATH_METADATA, handler),
    ];

    expect(route(prototype.list as Handler)).toEqual([RequestMethod.GET, '/']);
    expect(route(prototype.create as Handler)).toEqual([RequestMethod.POST, '/']);
    expect(route(prototype.update as Handler)).toEqual([RequestMethod.PATCH, ':id']);
    expect(route(prototype.remove as Handler)).toEqual([RequestMethod.DELETE, ':id']);
    expect(meta(HTTP_CODE_METADATA, prototype.remove as Handler)).toBe(HttpStatus.NO_CONTENT);
  });

  describe('DTOs', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const run = (metatype: new () => object, value: unknown, type: 'body' | 'query' = 'body') =>
      pipe.transform(value, { type, metatype });
    const valid = { name: ' Ana Lima ', email: ' Ana@Example.COM ', password: 'secret1234' };

    it('trims the name and lower-cases the email on create', async () => {
      await expect(run(CreateAdministratorDto, valid)).resolves.toEqual({
        name: 'Ana Lima',
        email: 'ana@example.com',
        password: 'secret1234',
      });
    });

    it.each([
      ['a short password', { ...valid, password: 'short12' }],
      ['an empty name', { ...valid, name: '   ' }],
      ['an invalid email', { ...valid, email: 'ana' }],
      ['an extra field', { ...valid, personalPhone: '18999999999' }],
      ['no password', { name: 'Ana', email: 'ana@example.com' }],
    ])('rejects %s on create', async (_label, body) => {
      await expect(run(CreateAdministratorDto, body)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a partial update and rejects the password there', async () => {
      await expect(run(UpdateAdministratorDto, { name: 'Ana Paula' })).resolves.toEqual({
        name: 'Ana Paula',
      });
      await expect(run(UpdateAdministratorDto, { password: 'secret1234' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it.each([
      ['sort=password', { sort: 'password' }],
      ['pageSize=30', { pageSize: '30' }],
    ])('rejects %s on the list', async (_label, query) => {
      await expect(run(ListAdministratorsQueryDto, query, 'query')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts sorting by email', async () => {
      await expect(
        run(ListAdministratorsQueryDto, { sort: 'email', order: 'desc' }, 'query'),
      ).resolves.toEqual({ sort: 'email', order: 'desc' });
    });
  });
});

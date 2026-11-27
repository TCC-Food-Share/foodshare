import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  Session: () => () => undefined,
}));

import { BadRequestException, ParseIntPipe, RequestMethod, ValidationPipe } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { ROLE } from '../../auth/roles.constants';
import { ROLES_KEY } from '../../auth/roles.guard';
import { AdminFoodItemsController } from '../lists/food-items/admin-food-items.controller';
import { AdminMeasurementUnitsController } from '../lists/measurement-units/admin-measurement-units.controller';
import {
  AdminFoodEditImpactQueryDto,
  AdminUpdateFoodDto,
  ListAdminFoodsQueryDto,
} from './admin-food.dto';
import { AdminFoodsController } from './admin-foods.controller';

type Handler = (...args: never[]) => unknown;
const meta = (key: string, target: object): unknown => Reflect.getMetadata(key, target);
const route = (handler: unknown) => [
  meta(METHOD_METADATA, handler as Handler),
  meta(PATH_METADATA, handler as Handler),
];

describe('admin foods routes', () => {
  const { prototype } = AdminFoodsController;

  it('lives under /admin/foods and requires the Administrator role', () => {
    expect(meta(PATH_METADATA, AdminFoodsController)).toBe('admin/foods');
    expect(meta(ROLES_KEY, AdminFoodsController)).toEqual([ROLE.ADMINISTRATOR]);
  });

  it('exposes list, detail, edit impact, update and the permanent deletion', () => {
    expect(route(prototype.list)).toEqual([RequestMethod.GET, '/']);
    expect(route(prototype.get)).toEqual([RequestMethod.GET, ':id']);
    expect(route(prototype.editImpact)).toEqual([RequestMethod.GET, ':id/edit-impact']);
    expect(route(prototype.update)).toEqual([RequestMethod.PATCH, ':id']);
    expect(route(prototype.remove)).toEqual([RequestMethod.DELETE, ':id']);
    expect(meta(HTTP_CODE_METADATA, prototype.remove as Handler)).toBe(204);
  });

  it('exposes the catalog items and units as options for the edit selects', () => {
    expect(route(AdminFoodItemsController.prototype.options)).toEqual([
      RequestMethod.GET,
      'options',
    ]);
    expect(route(AdminMeasurementUnitsController.prototype.options)).toEqual([
      RequestMethod.GET,
      'options',
    ]);
  });

  it('rejects a non-numeric id with 400', async () => {
    await expect(
      new ParseIntPipe().transform('abc', { type: 'param', data: 'id' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('DTOs', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const run = (metatype: new () => object, value: unknown, type: 'body' | 'query' = 'body') =>
      pipe.transform(value, { type, metatype });

    it.each([
      ['sort=password', { sort: 'password' }],
      ['pageSize=30', { pageSize: '30' }],
      ['the status Revisar', { status: 'Revisar' }],
      ['an unknown situation', { situation: 'archived' }],
    ])('rejects %s on the list', async (_label, query) => {
      await expect(run(ListAdminFoodsQueryDto, query, 'query')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts the filters and sorting by establishment', async () => {
      await expect(
        run(
          ListAdminFoodsQueryDto,
          { status: 'Reservado', situation: 'deleted', sort: 'establishment', order: 'desc' },
          'query',
        ),
      ).resolves.toMatchObject({ status: 'Reservado', situation: 'deleted' });
    });

    it('reads the numbers of the multipart body', async () => {
      await expect(
        run(AdminUpdateFoodDto, { catalogItemId: '14', measurementUnitId: '2', quantity: '2.5' }),
      ).resolves.toMatchObject({ catalogItemId: 14, measurementUnitId: 2, quantity: 2.5 });
    });

    it('clears the notes when they come empty', async () => {
      await expect(run(AdminUpdateFoodDto, { notes: '   ' })).resolves.toEqual({ notes: null });
    });

    it.each([
      ['three decimal places', { quantity: '1.234' }],
      ['a zero quantity', { quantity: '0' }],
      ['a publication with time', { publishedAt: '2026-11-01T10:00:00Z' }],
      ['an unknown request type', { requestType: 'ANY' }],
      ['the status', { status: 'Inativo' }],
      ['the deleted field', { deleted: 'true' }],
      ['the establishment', { establishmentId: '31' }],
    ])('rejects %s on update', async (_label, body) => {
      await expect(run(AdminUpdateFoodDto, body)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts the intended values on the impact preview', async () => {
      await expect(
        run(AdminFoodEditImpactQueryDto, { requestType: 'TOTAL_ONLY', quantity: '12' }, 'query'),
      ).resolves.toEqual({ requestType: 'TOTAL_ONLY', quantity: 12 });
    });
  });
});

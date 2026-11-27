import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  Session: () => () => undefined,
}));

import { BadRequestException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { ROLE } from '../../auth/roles.constants';
import { ROLES_KEY } from '../../auth/roles.guard';
import { CreateEstablishmentDto } from '../../establishments/dto/create-establishment.dto';
import { INSTITUTION_KIND } from '../../institutions/institution-kind';
import { AdminCancellationReasonsController } from '../lists/cancellation-reasons/admin-cancellation-reasons.controller';
import {
  AdminPageQueryDto,
  AdminUpdateInstitutionDto,
  ListAdminInstitutionsQueryDto,
} from './admin-institution.dto';
import { AdminInstitutionsController, ParseKindSegmentPipe } from './admin-institutions.controller';

type Handler = (...args: never[]) => unknown;
const meta = (key: string, target: object): unknown => Reflect.getMetadata(key, target);
const route = (handler: unknown) => [
  meta(METHOD_METADATA, handler as Handler),
  meta(PATH_METADATA, handler as Handler),
];

describe('admin institutions routes', () => {
  const { prototype } = AdminInstitutionsController;

  it('lives under /admin/institutions and requires the Administrator role', () => {
    expect(meta(PATH_METADATA, AdminInstitutionsController)).toBe('admin/institutions');
    expect(meta(ROLES_KEY, AdminInstitutionsController)).toEqual([ROLE.ADMINISTRATOR]);
  });

  it('exposes list, create per kind, profile, foods, orders, impact and update', () => {
    expect(route(prototype.list)).toEqual([RequestMethod.GET, '/']);
    expect(route(prototype.createEstablishment)).toEqual([RequestMethod.POST, 'establishments']);
    expect(route(prototype.createBeneficiaryEntity)).toEqual([
      RequestMethod.POST,
      'beneficiary-entities',
    ]);
    expect(route(prototype.getProfile)).toEqual([RequestMethod.GET, ':kind/:id']);
    expect(route(prototype.listFoods)).toEqual([RequestMethod.GET, 'establishments/:id/foods']);
    expect(route(prototype.listOrders)).toEqual([RequestMethod.GET, ':kind/:id/orders']);
    expect(route(prototype.impact)).toEqual([RequestMethod.GET, ':kind/:id/impact']);
    expect(route(prototype.update)).toEqual([RequestMethod.PATCH, ':kind/:id']);
  });

  it('exposes the permanent deletion as DELETE :kind/:id answering 204 (RF45, RF46)', () => {
    expect(route(prototype.remove)).toEqual([RequestMethod.DELETE, ':kind/:id']);
    expect(meta(HTTP_CODE_METADATA, prototype.remove as Handler)).toBe(204);
  });

  it('exposes the cancellation reason options for the soft delete', () => {
    expect(route(AdminCancellationReasonsController.prototype.options)).toEqual([
      RequestMethod.GET,
      'options',
    ]);
  });

  describe('kind segment', () => {
    const pipe = new ParseKindSegmentPipe();

    it('maps the URL segments to the institution kinds', () => {
      expect(pipe.transform('establishments')).toBe(INSTITUTION_KIND.ESTABLISHMENT);
      expect(pipe.transform('beneficiary-entities')).toBe(INSTITUTION_KIND.BENEFICIARY_ENTITY);
    });

    it('rejects any other segment with 400', () => {
      expect(() => pipe.transform('administrators')).toThrow(BadRequestException);
    });
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
      ['the CNPJ', { cnpj: '12.345.678/0001-90' }],
      ['the personal email', { email: 'x@example.com' }],
      ['the company name', { companyName: 'Other Ltd' }],
      ['the password', { password: 'secret1234' }],
    ])('refuses %s on update (RN27)', async (_label, body) => {
      await expect(run(AdminUpdateInstitutionDto, body)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('reads deleted and the reason from multipart text', async () => {
      await expect(
        run(AdminUpdateInstitutionDto, { deleted: 'true', cancellationReasonId: '4' }),
      ).resolves.toMatchObject({ deleted: true, cancellationReasonId: 4 });
      await expect(run(AdminUpdateInstitutionDto, { deleted: 'false' })).resolves.toMatchObject({
        deleted: false,
      });
    });

    it('rejects a non-boolean deleted', async () => {
      await expect(run(AdminUpdateInstitutionDto, { deleted: 'yes' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('clears the trade name when it comes empty (DT40)', async () => {
      await expect(run(AdminUpdateInstitutionDto, { tradeName: '  ' })).resolves.toEqual({
        tradeName: null,
      });
    });

    it('validates the create body with the public sign-up DTO', async () => {
      await expect(run(CreateEstablishmentDto, { name: 'Ana' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it.each([
      ['sort=password', { sort: 'password' }],
      ['pageSize=30', { pageSize: '30' }],
      ['an unknown type', { type: 'ADMINISTRATOR' }],
      ['an unknown status', { status: 'unconfirmed' }],
    ])('rejects %s on the list', async (_label, query) => {
      await expect(run(ListAdminInstitutionsQueryDto, query, 'query')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts the filters and sorting by responsible name', async () => {
      await expect(
        run(
          ListAdminInstitutionsQueryDto,
          { type: 'ESTABLISHMENT', status: 'deleted', sort: 'responsibleName', order: 'desc' },
          'query',
        ),
      ).resolves.toEqual({
        type: 'ESTABLISHMENT',
        status: 'deleted',
        sort: 'responsibleName',
        order: 'desc',
      });
    });

    it('rejects pageSize=30 on the profile lists', async () => {
      await expect(run(AdminPageQueryDto, { pageSize: '30' }, 'query')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});

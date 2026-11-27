import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { OrderCancelledBy } from '../../../generated/prisma/client';
import { AccountDeletionService } from '../../account-deletion/account-deletion.service';
import { AuditService } from '../../audit/audit.service';
import type { ValidatedImage } from '../../files/image-file.pipe';
import { ImageStorageService } from '../../files/image-storage.service';
import { FOOD_STATUS } from '../../foods/foods.constants';
import { INSTITUTION_KIND } from '../../institutions/institution-kind';
import {
  type InstitutionCreateInput,
  InstitutionRegistrationService,
  type RegisterOptions,
  type UpdateOptions,
} from '../../institutions/institution-registration.service';
import { ORDER_STATUS } from '../../orders/orders.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminInstitutionsService } from './admin-institutions.service';
import {
  INSTITUTION_DATA_ALREADY_REGISTERED,
  INSTITUTION_NOT_SOFT_DELETED,
} from './institution.errors';

type AnyFn = (...args: never[]) => unknown;
const fn = <T extends AnyFn = (...args: unknown[]) => Promise<unknown>>() => jest.fn<T>();

const actor = { id: 1, name: 'Admin', email: 'admin@example.com' };
const image: ValidatedImage = { buffer: Buffer.from([0x89]), type: 'png' };

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  userId: 20,
  addressId: 30,
  companyName: 'Padaria São José Ltda',
  tradeName: 'Padaria São José',
  cnpj: '12.345.678/0001-90',
  institutionalEmail: 'contato@padaria.com',
  institutionalPhone: '(18) 3644-1234',
  description: 'Pães do dia',
  deleted: false,
  createdAt: new Date('2026-11-01T12:00:00Z'),
  user: {
    id: 20,
    name: 'João Araújo',
    email: 'joao@example.com',
    personalPhone: '(18) 99123-4567',
    image: 'users/a.png',
    emailVerified: true,
  },
  address: {
    postalCode: '16200-000',
    street: 'Rua A',
    number: '1',
    complement: null,
    city: 'Birigui',
    state: 'SP',
  },
  ...overrides,
});

describe('AdminInstitutionsService', () => {
  const tx = {
    establishment: { update: fn() },
    beneficiaryEntity: { update: fn() },
    user: { update: fn() },
    $queryRaw: fn(),
  };

  const prismaMock = {
    establishment: { findMany: fn(), findUnique: fn() },
    beneficiaryEntity: { findMany: fn(), findUnique: fn() },
    orderStatus: { findMany: fn() },
    foodStatus: { findMany: fn() },
    order: { groupBy: fn(), findMany: fn(), count: fn() },
    food: { groupBy: fn(), findMany: fn(), count: fn() },
    cancellationReason: { findUnique: fn() },
    $transaction: fn(),
  };
  const storageMock = {
    toUrl: (key: string | null) => (key ? `https://api.test/files/${key}` : null),
    removeQuietly: fn(),
  };
  const auditMock = { record: fn() };
  const registrationMock = { register: fn(), update: fn() };
  const deletionMock = {
    closeEstablishment: fn(),
    closeBeneficiaryEntity: fn(),
    closeUser: fn(),
    impact: fn(),
  };

  let service: AdminInstitutionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.establishment.findMany.mockResolvedValue([]);
    prismaMock.beneficiaryEntity.findMany.mockResolvedValue([]);
    prismaMock.establishment.findUnique.mockResolvedValue(row());
    prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(row({ id: 11 }));
    prismaMock.orderStatus.findMany.mockResolvedValue(
      Object.values(ORDER_STATUS).map((name, index) => ({ id: index + 1, name })),
    );
    prismaMock.foodStatus.findMany.mockResolvedValue(
      Object.values(FOOD_STATUS).map((name, index) => ({ id: index + 10, name })),
    );
    prismaMock.order.groupBy.mockResolvedValue([]);
    prismaMock.food.groupBy.mockResolvedValue([]);
    prismaMock.food.count.mockResolvedValue(0);
    prismaMock.cancellationReason.findUnique.mockResolvedValue({ id: 4, isSystem: false });
    auditMock.record.mockResolvedValue(undefined);
    deletionMock.closeUser.mockResolvedValue(undefined);
    tx.$queryRaw.mockResolvedValue([{ deleted: true }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminInstitutionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ImageStorageService, useValue: storageMock },
        { provide: AuditService, useValue: auditMock },
        { provide: InstitutionRegistrationService, useValue: registrationMock },
        { provide: AccountDeletionService, useValue: deletionMock },
      ],
    }).compile();
    service = moduleRef.get(AdminInstitutionsService);
  });

  describe('list', () => {
    beforeEach(() => {
      prismaMock.establishment.findMany.mockResolvedValue([
        row(),
        row({
          id: 12,
          companyName: 'Mercado Aurora Ltda',
          tradeName: null,
          createdAt: new Date('2026-11-06T01:00:00Z'),
          user: { ...row().user, name: 'Bia', personalPhone: '18911112222', emailVerified: false },
        }),
      ]);
      prismaMock.beneficiaryEntity.findMany.mockResolvedValue([
        row({
          id: 10,
          companyName: 'Abrigo Esperança',
          deleted: true,
          createdAt: new Date('2026-10-01T12:00:00Z'),
        }),
      ]);
    });

    it('lists both kinds together, newest registration first by default', async () => {
      const result = await service.list({});

      expect(result.total).toBe(3);
      expect(result.data.map((item) => [item.kind, item.id])).toEqual([
        [INSTITUTION_KIND.ESTABLISHMENT, 12],
        [INSTITUTION_KIND.ESTABLISHMENT, 10],
        [INSTITUTION_KIND.BENEFICIARY_ENTITY, 10],
      ]);
    });

    it('brings the responsible data, the confirmation flag and no secrets', async () => {
      const { data } = await service.list({});

      expect(data[0]).toMatchObject({
        responsible: { name: 'Bia', personalPhone: '18911112222' },
        emailVerified: false,
        image: 'https://api.test/files/users/a.png',
      });
      expect(data[0]).not.toHaveProperty('searchText');
      expect(JSON.stringify(data)).not.toMatch(/password/i);
    });

    it('filters by kind without querying the other table', async () => {
      const result = await service.list({ type: INSTITUTION_KIND.BENEFICIARY_ENTITY });

      expect(prismaMock.establishment.findMany).not.toHaveBeenCalled();
      expect(result.data.map((item) => item.kind)).toEqual([INSTITUTION_KIND.BENEFICIARY_ENTITY]);
    });

    it('filters by situation in the query', async () => {
      await service.list({ status: 'deleted' });

      expect(prismaMock.establishment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deleted: true } }),
      );
    });

    it('finds the responsible name without accents', async () => {
      const result = await service.list({ search: 'joao araujo' });

      expect(result.total).toBe(2);
    });

    it('finds a personal phone typed without punctuation', async () => {
      const result = await service.list({ search: '991234567' });

      expect(result.data.map((item) => item.id)).toEqual([10, 10]);
    });

    it('finds a phone stored without punctuation when typed with it', async () => {
      const result = await service.list({ search: '(18) 91111' });

      expect(result.data.map((item) => item.id)).toEqual([12]);
    });

    it('finds the registration date in the Brasília time zone', async () => {
      const result = await service.list({ search: '05/11' });

      expect(result.data.map((item) => item.id)).toEqual([12]);
    });

    it('sorts by the responsible name when asked', async () => {
      const result = await service.list({ sort: 'responsibleName', order: 'asc' });

      expect(result.data[0].responsible.name).toBe('Bia');
    });
  });

  describe('create', () => {
    it('registers through the core with the panel conflict and audits without the password', async () => {
      const dto = { password: 'secret1234' } as InstitutionCreateInput;
      registrationMock.register.mockImplementation(async (...args: unknown[]) => {
        const options = args[3] as RegisterOptions;
        await options.inTransaction?.(tx as never, row() as never);
        return row();
      });

      const result = await service.create(actor, INSTITUTION_KIND.ESTABLISHMENT, dto, image);

      expect(registrationMock.register).toHaveBeenCalledWith(
        INSTITUTION_KIND.ESTABLISHMENT,
        dto,
        image,
        expect.anything(),
      );
      const options = registrationMock.register.mock.calls[0][3] as RegisterOptions;
      expect(options.conflict(['cnpj'])).toMatchObject({
        response: { code: INSTITUTION_DATA_ALREADY_REGISTERED, fields: ['cnpj'] },
      });
      expect(auditMock.record).toHaveBeenCalledWith(tx, {
        administrator: actor,
        action: 'establishment.create',
        entityType: 'Establishment',
        entityId: 10,
        details: {
          companyName: 'Padaria São José Ltda',
          cnpj: '12.345.678/0001-90',
          email: 'joao@example.com',
        },
      });
      expect(JSON.stringify(auditMock.record.mock.calls)).not.toContain('secret1234');
      expect(result.kind).toBe(INSTITUTION_KIND.ESTABLISHMENT);
    });
  });

  describe('profile', () => {
    it('counts foods per status, deleted foods and received orders', async () => {
      prismaMock.food.groupBy.mockResolvedValue([
        { statusId: 10, _count: { _all: 2 } },
        { statusId: 12, _count: { _all: 1 } },
      ]);
      prismaMock.food.count.mockResolvedValue(1);
      prismaMock.order.groupBy.mockResolvedValue([{ statusId: 4, _count: { _all: 3 } }]);

      const profile = await service.getProfile(INSTITUTION_KIND.ESTABLISHMENT, 10);

      expect(profile.activity).toEqual({
        foods: { active: 2, reserved: 0, inactive: 1, deleted: 1 },
        orders: { pending: 0, inProgress: 0, rejected: 0, donated: 3, cancelled: 0 },
      });
      expect(prismaMock.order.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { establishmentId: 10 } }),
      );
      expect(profile.responsible).toEqual({
        userId: 20,
        name: 'João Araújo',
        email: 'joao@example.com',
        personalPhone: '(18) 99123-4567',
      });
    });

    it('has no food indicators for an entity and counts its orders', async () => {
      prismaMock.order.groupBy.mockResolvedValue([
        { statusId: 1, _count: { _all: 1 } },
        { statusId: 5, _count: { _all: 2 } },
      ]);

      const profile = await service.getProfile(INSTITUTION_KIND.BENEFICIARY_ENTITY, 11);

      expect(profile.activity.foods).toBeNull();
      expect(profile.activity.orders).toMatchObject({ pending: 1, cancelled: 2 });
      expect(prismaMock.order.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { beneficiaryEntityId: 11 } }),
      );
    });

    it('answers 404 for an id that is not of the kind', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(INSTITUTION_KIND.ESTABLISHMENT, 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('pages the foods of an establishment, deleted ones included', async () => {
      prismaMock.food.findMany.mockResolvedValue([]);
      prismaMock.food.count.mockResolvedValue(15);

      const result = await service.listFoods(10, { page: 2, pageSize: 10 });

      expect(prismaMock.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { establishmentId: 10 }, skip: 10, take: 10 }),
      );
      expect(result).toMatchObject({ total: 15, page: 2, pageSize: 10 });
    });

    it('names the other party of each order', async () => {
      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 3,
          quantity: '2.5',
          orderDate: new Date('2026-11-02T12:00:00Z'),
          deleted: true,
          status: { name: ORDER_STATUS.CANCELLED },
          food: { catalogItem: { name: 'Arroz' }, measurementUnit: { abbreviation: 'kg' } },
          establishment: { companyName: 'Padaria Ltda', tradeName: null },
          beneficiaryEntity: { companyName: 'Abrigo Ltda', tradeName: 'Abrigo' },
        },
      ]);
      prismaMock.order.count.mockResolvedValue(1);

      const result = await service.listOrders(INSTITUTION_KIND.ESTABLISHMENT, 10, {});

      expect(result.data[0]).toMatchObject({
        counterpartName: 'Abrigo',
        quantity: 2.5,
        unit: 'kg',
        status: ORDER_STATUS.CANCELLED,
        deleted: true,
      });
    });
  });

  describe('update', () => {
    const changes = { before: { description: 'old' }, after: { description: 'new' } };

    beforeEach(() => {
      registrationMock.update.mockImplementation(async (...args: unknown[]) => {
        const options = args[4] as UpdateOptions;
        await options.beforeUpdate?.(tx as never, args[1] as never);
        await options.afterUpdate?.(tx as never, changes, args[1] as never);
        return args[1];
      });
    });

    it('refuses a reason without deleted = true', async () => {
      await expect(
        service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, { cancellationReasonId: 4 }),
      ).rejects.toMatchObject({ response: { code: 'CANCELLATION_REASON_WITHOUT_DELETE' } });
      expect(registrationMock.update).not.toHaveBeenCalled();
    });

    it('requires a reason to soft delete an active institution', async () => {
      await expect(
        service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, { deleted: true }),
      ).rejects.toMatchObject({ response: { code: 'CANCELLATION_REASON_REQUIRED' } });
      expect(registrationMock.update).not.toHaveBeenCalled();
    });

    it('refuses a system reason', async () => {
      prismaMock.cancellationReason.findUnique.mockResolvedValue({ id: 1, isSystem: true });

      await expect(
        service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, {
          deleted: true,
          cancellationReasonId: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('soft deletes an establishment as the administrator, closes the sessions and audits', async () => {
      deletionMock.closeEstablishment.mockResolvedValue({
        closed: true,
        rejectedOrders: 2,
        cancelledOrders: 1,
      });

      await service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, {
        deleted: true,
        cancellationReasonId: 4,
      });

      expect(deletionMock.closeEstablishment).toHaveBeenCalledWith(tx, 10, {
        cancellationReasonId: 4,
        cancelledBy: OrderCancelledBy.ADMINISTRATOR,
      });
      expect(deletionMock.closeUser).toHaveBeenCalledWith(tx, 20);
      expect(auditMock.record).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'establishment.soft_delete',
          details: { cancellationReasonId: 4, rejectedOrders: 2, cancelledOrders: 1 },
        }),
      );
    });

    it('soft deletes an entity through its own closure', async () => {
      deletionMock.closeBeneficiaryEntity.mockResolvedValue({
        closed: true,
        rejectedOrders: 0,
        cancelledOrders: 3,
      });

      await service.update(actor, INSTITUTION_KIND.BENEFICIARY_ENTITY, 11, {
        deleted: true,
        cancellationReasonId: 4,
      });

      expect(deletionMock.closeBeneficiaryEntity).toHaveBeenCalledWith(tx, 11, {
        cancellationReasonId: 4,
        cancelledBy: OrderCancelledBy.ADMINISTRATOR,
      });
      expect(deletionMock.closeEstablishment).not.toHaveBeenCalled();
    });

    it('does nothing more when a concurrent deletion already closed the institution', async () => {
      deletionMock.closeEstablishment.mockResolvedValue({
        closed: false,
        rejectedOrders: 0,
        cancelledOrders: 0,
      });

      await service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, {
        deleted: true,
        cancellationReasonId: 4,
      });

      expect(deletionMock.closeUser).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ action: 'establishment.soft_delete' }),
      );
    });

    it('accepts deleted = true without a reason on an institution already deleted', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(row({ deleted: true }));

      await service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, { deleted: true });

      expect(deletionMock.closeEstablishment).not.toHaveBeenCalled();
    });

    it('restores a deleted institution and its user, without touching foods or orders', async () => {
      prismaMock.establishment.findUnique.mockResolvedValue(row({ deleted: true }));

      await service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, { deleted: false });

      expect(tx.establishment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { deleted: false },
      });
      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 20 }, data: { deleted: false } });
      expect(auditMock.record).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ action: 'establishment.restore' }),
      );
    });

    it('restores nothing when the institution is active', async () => {
      tx.$queryRaw.mockResolvedValue([{ deleted: false }]);

      await service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, { deleted: false });

      expect(tx.establishment.update).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ action: 'establishment.restore' }),
      );
    });

    it('audits the changed fields only and passes the plain fields to the core', async () => {
      await service.update(
        actor,
        INSTITUTION_KIND.BENEFICIARY_ENTITY,
        11,
        { description: 'new' },
        image,
      );

      expect(registrationMock.update).toHaveBeenCalledWith(
        INSTITUTION_KIND.BENEFICIARY_ENTITY,
        expect.objectContaining({ id: 11 }),
        { description: 'new' },
        image,
        expect.anything(),
      );
      expect(auditMock.record).toHaveBeenCalledWith(tx, {
        administrator: actor,
        action: 'beneficiary_entity.update',
        entityType: 'BeneficiaryEntity',
        entityId: 11,
        details: changes,
      });
    });

    it('answers 404 for a missing institution', async () => {
      prismaMock.beneficiaryEntity.findUnique.mockResolvedValue(null);

      await expect(
        service.update(actor, INSTITUTION_KIND.BENEFICIARY_ENTITY, 99, { description: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 404 when a permanent deletion committed before the transaction', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.update(actor, INSTITUTION_KIND.ESTABLISHMENT, 10, { deleted: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.establishment.update).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const removeTx = {
      $queryRaw: fn(),
      establishment: { findUnique: fn(), delete: fn() },
      beneficiaryEntity: { findUnique: fn(), delete: fn() },
      food: { findMany: fn(), deleteMany: fn() },
      order: { findMany: fn(), deleteMany: fn() },
      suggestion: { deleteMany: fn() },
      verification: { deleteMany: fn() },
      address: { delete: fn() },
      user: { delete: fn() },
    };

    beforeEach(() => {
      prismaMock.$transaction.mockImplementation(async (...args: unknown[]) =>
        (args[0] as (client: typeof removeTx) => Promise<unknown>)(removeTx),
      );
      removeTx.$queryRaw.mockResolvedValue([{ deleted: true }]);
      removeTx.establishment.findUnique.mockResolvedValue(row({ deleted: true }));
      removeTx.beneficiaryEntity.findUnique.mockResolvedValue(row({ id: 11, deleted: true }));
      removeTx.establishment.delete.mockResolvedValue({ addressId: 30 });
      removeTx.beneficiaryEntity.delete.mockResolvedValue({ addressId: 31 });
      removeTx.food.findMany.mockResolvedValue([
        { id: 100, image: 'foods/a.webp' },
        { id: 101, image: 'foods/b.webp' },
      ]);
      removeTx.food.deleteMany.mockResolvedValue({ count: 2 });
      removeTx.order.findMany.mockResolvedValue([{ id: 7 }, { id: 8 }]);
      removeTx.order.deleteMany.mockResolvedValue({ count: 2 });
      removeTx.suggestion.deleteMany.mockResolvedValue({ count: 1 });
      removeTx.verification.deleteMany.mockResolvedValue({ count: 0 });
      storageMock.removeQuietly.mockResolvedValue(undefined);
    });

    it('deletes an establishment with its foods, orders, suggestions and codes', async () => {
      await service.remove(actor, INSTITUTION_KIND.ESTABLISHMENT, 10);

      expect(removeTx.order.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ establishmentId: 10 }, { foodId: { in: [100, 101] } }] },
      });
      expect(removeTx.food.deleteMany).toHaveBeenCalledWith({ where: { establishmentId: 10 } });
      expect(removeTx.suggestion.deleteMany).toHaveBeenCalledWith({ where: { requesterId: 20 } });
      expect(removeTx.establishment.delete).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { addressId: true },
      });
      expect(removeTx.address.delete).toHaveBeenCalledWith({ where: { id: 30 } });
      expect(removeTx.verification.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: {
            in: ['email-verification-otp-joao@example.com', 'forget-password-otp-joao@example.com'],
          },
        },
      });
      expect(removeTx.user.delete).toHaveBeenCalledWith({ where: { id: 20 } });
    });

    it('deletes the orders before the foods, and the foods before the establishment', async () => {
      await service.remove(actor, INSTITUTION_KIND.ESTABLISHMENT, 10);

      const [orders] = removeTx.order.deleteMany.mock.invocationCallOrder;
      const [foods] = removeTx.food.deleteMany.mock.invocationCallOrder;
      const [establishment] = removeTx.establishment.delete.mock.invocationCallOrder;
      const [user] = removeTx.user.delete.mock.invocationCallOrder;
      expect(orders).toBeLessThan(foods);
      expect(foods).toBeLessThan(establishment);
      expect(establishment).toBeLessThan(user);
    });

    it('audits company name, CNPJ and counts, without personal data', async () => {
      await service.remove(actor, INSTITUTION_KIND.ESTABLISHMENT, 10);

      expect(auditMock.record).toHaveBeenCalledWith(removeTx, {
        administrator: actor,
        action: 'establishment.delete',
        entityType: 'Establishment',
        entityId: 10,
        details: {
          companyName: 'Padaria São José Ltda',
          cnpj: '12.345.678/0001-90',
          deletedFoods: 2,
          deletedOrders: 2,
          deletedSuggestions: 1,
        },
      });
      const details = JSON.stringify(auditMock.record.mock.calls[0]);
      expect(details).not.toContain('joao@example.com');
      expect(details).not.toContain('João Araújo');
      expect(details).not.toContain('99123-4567');
    });

    it('removes the user and food images only after the commit', async () => {
      let committed = false;
      prismaMock.$transaction.mockImplementation(async (...args: unknown[]) => {
        const result = await (args[0] as (client: typeof removeTx) => Promise<unknown>)(removeTx);
        committed = true;
        return result;
      });
      storageMock.removeQuietly.mockImplementation(() => {
        expect(committed).toBe(true);
        return Promise.resolve();
      });

      await service.remove(actor, INSTITUTION_KIND.ESTABLISHMENT, 10);

      expect(storageMock.removeQuietly.mock.calls.map(([key]) => key)).toEqual([
        'users/a.png',
        'foods/a.webp',
        'foods/b.webp',
      ]);
    });

    it('deletes an entity with its orders only, leaving foods untouched', async () => {
      await service.remove(actor, INSTITUTION_KIND.BENEFICIARY_ENTITY, 11);

      expect(removeTx.order.deleteMany).toHaveBeenCalledWith({
        where: { beneficiaryEntityId: 11 },
      });
      expect(removeTx.food.findMany).not.toHaveBeenCalled();
      expect(removeTx.food.deleteMany).not.toHaveBeenCalled();
      expect(removeTx.address.delete).toHaveBeenCalledWith({ where: { id: 31 } });
      expect(auditMock.record).toHaveBeenCalledWith(
        removeTx,
        expect.objectContaining({
          action: 'beneficiary_entity.delete',
          details: expect.objectContaining({ deletedFoods: 0, deletedOrders: 2 }),
        }),
      );
      expect(storageMock.removeQuietly.mock.calls.map(([key]) => key)).toEqual(['users/a.png']);
    });

    it('refuses an active institution without deleting anything', async () => {
      removeTx.$queryRaw.mockResolvedValue([{ deleted: false }]);

      await expect(service.remove(actor, INSTITUTION_KIND.ESTABLISHMENT, 10)).rejects.toMatchObject(
        { response: { code: INSTITUTION_NOT_SOFT_DELETED } },
      );
      expect(removeTx.order.deleteMany).not.toHaveBeenCalled();
      expect(removeTx.user.delete).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
      expect(storageMock.removeQuietly).not.toHaveBeenCalled();
    });

    it('answers 404 for a missing institution or one of the other kind', async () => {
      removeTx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.remove(actor, INSTITUTION_KIND.BENEFICIARY_ENTITY, 10),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(removeTx.order.deleteMany).not.toHaveBeenCalled();
    });

    it('removes no image when the transaction fails', async () => {
      auditMock.record.mockRejectedValue(new Error('audit down'));

      await expect(service.remove(actor, INSTITUTION_KIND.ESTABLISHMENT, 10)).rejects.toThrow(
        'audit down',
      );
      expect(storageMock.removeQuietly).not.toHaveBeenCalled();
    });

    it('locks the orders in id order before deleting them', async () => {
      await service.remove(actor, INSTITUTION_KIND.BENEFICIARY_ENTITY, 11);

      const lockCall = removeTx.$queryRaw.mock.calls.find(([sql]) =>
        (sql as TemplateStringsArray).join('?').includes('FROM "order"'),
      );
      expect(lockCall).toBeDefined();
      expect((lockCall?.[0] as TemplateStringsArray).join('?')).toContain('ORDER BY id FOR UPDATE');
      const [lock] = removeTx.$queryRaw.mock.invocationCallOrder.slice(-1);
      const [deleteOrders] = removeTx.order.deleteMany.mock.invocationCallOrder;
      expect(lock).toBeLessThan(deleteOrders);
    });
  });
});

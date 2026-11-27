import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { lockEstablishmentForShare } from '../../account-deletion/institution-locks';
import { type AuditAdministrator, AuditService } from '../../audit/audit.service';
import { publicName } from '../../common/institution-public';
import { IMAGE_FOLDER } from '../../files/files.constants';
import type { ValidatedImage } from '../../files/image-file.pipe';
import { ImageStorageService } from '../../files/image-storage.service';
import {
  brasiliaMidnight,
  dateInBrasilia,
  isAfterTodayInBrasilia,
  isExpirationDateInPast,
} from '../../foods/food-dates';
import {
  applyAdminEditToPendingOrders,
  countAdminEditEffect,
  type FoodEditTarget,
  lockFood,
  pendingOrdersEffect,
} from '../../foods/food-order-effects';
import { checkFoodQuantity } from '../../foods/food-quantity';
import {
  EXPIRATION_DATE_IN_PAST,
  FOOD_HAS_ORDERS_IN_PROGRESS,
  FOOD_NOT_ACTIVE,
  FOOD_STATUS,
  INVALID_CATALOG_ITEM,
  INVALID_MEASUREMENT_UNIT,
} from '../../foods/foods.constants';
import { lockOrders } from '../../orders/order-locks';
import { ORDER_STATUS } from '../../orders/orders.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { type Paginated, paginateInMemory } from '../lists/common/paginate-in-memory';
import type {
  AdminFoodDetailDto,
  AdminFoodEditImpactDto,
  AdminFoodEditImpactQueryDto,
  AdminFoodOrderCountsDto,
  AdminFoodRowDto,
  AdminUpdateFoodDto,
  ListAdminFoodsQueryDto,
} from './admin-food.dto';
import {
  foodDeleted,
  foodNotFound,
  nothingToUpdate,
  publishedAtInFuture,
} from './admin-food.errors';

const FOOD_INCLUDE = {
  catalogItem: { include: { category: true } },
  measurementUnit: true,
  status: true,
  establishment: { select: { id: true, companyName: true, tradeName: true, deleted: true } },
} as const satisfies Prisma.FoodInclude;

type FoodRow = Prisma.FoodGetPayload<{ include: typeof FOOD_INCLUDE }>;

const ORDER_KEYS: Record<string, keyof AdminFoodOrderCountsDto> = {
  [ORDER_STATUS.PENDING]: 'pending',
  [ORDER_STATUS.IN_PROGRESS]: 'inProgress',
  [ORDER_STATUS.REJECTED]: 'rejected',
  [ORDER_STATUS.DONATED]: 'donated',
  [ORDER_STATUS.CANCELLED]: 'cancelled',
};

const AUDIT_ENTITY = 'Food';

// The expiration date is a calendar day stored at UTC midnight; the publication is an instant shown
// in Brasília. Each is formatted in the zone that gives back the day the screen shows.
const dayMonthYear = (timeZone: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });
const expirationDay = dayMonthYear('UTC');
const publicationDay = dayMonthYear('America/Sao_Paulo');

interface SearchableRow extends AdminFoodRowDto {
  searchText: string[];
}

/** One field that changed in the edit, for the audit (RN46). */
type Changes = Record<string, { from: unknown; to: unknown }>;

@Injectable()
export class AdminFoodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
    private readonly audit: AuditService,
  ) {}

  /** RF52 and DT60: every food, in any status, soft deleted or not. */
  async list(query: ListAdminFoodsQueryDto): Promise<Paginated<AdminFoodRowDto>> {
    const foods = await this.prisma.food.findMany({
      where: {
        ...(query.status !== undefined && { status: { name: query.status } }),
        ...(query.situation !== undefined && { deleted: query.situation === 'deleted' }),
      },
      include: {
        ...FOOD_INCLUDE,
        _count: {
          select: {
            orders: { where: { deleted: false, status: { name: ORDER_STATUS.IN_PROGRESS } } },
          },
        },
      },
    });

    const rows: SearchableRow[] = foods.map((food) => {
      const row = this.toRow(food, food._count.orders);
      return {
        ...row,
        searchText: [
          row.name,
          row.category.name,
          food.establishment.companyName,
          food.establishment.tradeName ?? '',
          expirationDay.format(food.expirationDate),
          publicationDay.format(food.publishedAt),
        ],
      };
    });

    const result = paginateInMemory(
      rows,
      {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        sort: query.sort ?? 'publishedAt',
        order: query.sort ? query.order : (query.order ?? 'desc'),
      },
      {
        searchText: (row) => row.searchText,
        sortValues: {
          name: (row) => row.name,
          category: (row) => row.category.name,
          quantity: (row) => Number(row.quantity),
          status: (row) => row.status,
          establishment: (row) => row.establishment.publicName,
          expirationDate: (row) => row.expirationDate.getTime(),
          publishedAt: (row) => row.publishedAt.getTime(),
        },
      },
    );
    return { ...result, data: result.data.map(({ searchText: _text, ...row }) => row) };
  }

  /** RF53: any food, whatever its status or the establishment's. */
  async get(id: number): Promise<AdminFoodDetailDto> {
    const food = await this.prisma.food.findUnique({ where: { id }, include: FOOD_INCLUDE });
    if (!food) throw foodNotFound();
    const orders = await this.orderCounts(this.prisma, id);
    return {
      ...this.toRow(food, orders.inProgress),
      catalogItemId: food.catalogItemId,
      description: food.description,
      notes: food.notes,
      orders,
    };
  }

  /** DT58: what the edit would do to the pending orders, without writing. */
  async editImpact(
    id: number,
    query: AdminFoodEditImpactQueryDto,
  ): Promise<AdminFoodEditImpactDto> {
    const food = await this.prisma.food.findUnique({ where: { id } });
    if (!food) throw foodNotFound();

    const current = editTarget(food);
    const next: FoodEditTarget = {
      catalogItemId: query.catalogItemId ?? current.catalogItemId,
      measurementUnitId: query.measurementUnitId ?? current.measurementUnitId,
      requestType: query.requestType ?? current.requestType,
      quantity: query.quantity ?? current.quantity,
    };
    const { updated, rejected } = await countAdminEditEffect(
      this.prisma,
      id,
      pendingOrdersEffect(current, next),
    );
    return { ordersToUpdate: updated, ordersToReject: rejected };
  }

  /** RF50, DT57 and DT58: only the fields sent change; the pending orders follow in the same transaction. */
  async update(
    actor: AuditAdministrator,
    id: number,
    dto: AdminUpdateFoodDto,
    image?: ValidatedImage,
  ): Promise<AdminFoodDetailDto> {
    if (!image && Object.values(dto).every((value) => value === undefined)) {
      throw nothingToUpdate();
    }

    const imageKey = image ? await this.storage.store(IMAGE_FOLDER.FOODS, image) : null;
    let replacedImage: string | null;
    try {
      replacedImage = await this.prisma.$transaction(async (tx) => {
        const food = await this.lockForWrite(tx, id);
        if (food.deleted) throw foodDeleted();
        if (food.status.name !== FOOD_STATUS.ACTIVE) {
          throw conflict(FOOD_NOT_ACTIVE, `Food is not "${FOOD_STATUS.ACTIVE}".`);
        }
        const inProgress = await tx.order.count({
          where: { foodId: id, deleted: false, status: { name: ORDER_STATUS.IN_PROGRESS } },
        });
        if (inProgress > 0) {
          throw conflict(FOOD_HAS_ORDERS_IN_PROGRESS, 'Food has orders in progress.');
        }

        const { data, changes } = await this.planUpdate(tx, food, dto);
        if (imageKey) {
          data.image = imageKey;
          changes.image = { from: food.image, to: imageKey };
        }
        if (Object.keys(changes).length === 0) return null;

        await tx.food.update({ where: { id }, data });
        const final: FoodEditTarget = {
          catalogItemId: dto.catalogItemId ?? food.catalogItemId,
          measurementUnitId: dto.measurementUnitId ?? food.measurementUnitId,
          requestType: dto.requestType ?? food.requestType,
          quantity: dto.quantity ?? food.quantity.toNumber(),
        };
        const orders = await applyAdminEditToPendingOrders(
          tx,
          id,
          pendingOrdersEffect(editTarget(food), final),
        );

        await this.audit.record(tx, {
          administrator: actor,
          action: 'food.update',
          entityType: AUDIT_ENTITY,
          entityId: id,
          details: { changes, updatedOrders: orders.updated, rejectedOrders: orders.rejected },
        });
        return imageKey ? food.image : null;
      });
    } catch (error) {
      if (imageKey) await this.storage.removeQuietly(imageKey);
      throw error;
    }

    // Only after the commit (docs/MODELO-DE-DADOS.md).
    if (replacedImage) await this.storage.removeQuietly(replacedImage);
    return this.get(id);
  }

  /** RF51 and DT59: the food and every order of it, in one transaction; the image after the commit. */
  async remove(actor: AuditAdministrator, id: number): Promise<void> {
    const image = await this.prisma.$transaction(async (tx) => {
      const food = await this.lockForWrite(tx, id);
      const deletedOrders = await this.orderCounts(tx, id);

      await lockOrders(tx, { foodId: id });
      await tx.order.deleteMany({ where: { foodId: id } });
      await tx.food.delete({ where: { id } });

      await this.audit.record(tx, {
        administrator: actor,
        action: 'food.delete',
        entityType: AUDIT_ENTITY,
        entityId: id,
        details: {
          foodName: food.catalogItem.name,
          establishment: { id: food.establishment.id, companyName: food.establishment.companyName },
          deletedOrders,
        },
      });
      return food.image;
    });

    await this.storage.removeQuietly(image);
  }

  /**
   * Lock order of docs/CONVENCOES.md: establishment (FOR SHARE, so a deletion of it in flight
   * finishes first) -> food (FOR UPDATE). The food is read again after the lock: a concurrent
   * permanent deletion gives 404.
   */
  private async lockForWrite(tx: Prisma.TransactionClient, id: number): Promise<FoodRow> {
    const owner = await tx.food.findUnique({ where: { id }, select: { establishmentId: true } });
    if (!owner) throw foodNotFound();
    if (!(await lockEstablishmentForShare(tx, owner.establishmentId))) throw foodNotFound();
    await lockFood(tx, id);
    const food = await tx.food.findUnique({ where: { id }, include: FOOD_INCLUDE });
    if (!food) throw foodNotFound();
    return food;
  }

  private async planUpdate(
    tx: Prisma.TransactionClient,
    food: FoodRow,
    dto: AdminUpdateFoodDto,
  ): Promise<{ data: Prisma.FoodUncheckedUpdateInput; changes: Changes }> {
    const data: Prisma.FoodUncheckedUpdateInput = {};
    const changes: Changes = {};
    const change = (field: string, from: unknown, to: unknown) => {
      changes[field] = { from, to };
    };

    if (dto.catalogItemId !== undefined && dto.catalogItemId !== food.catalogItemId) {
      const item = await tx.foodCatalogItem.findUnique({ where: { id: dto.catalogItemId } });
      if (!item) throw badRequest(INVALID_CATALOG_ITEM, 'Food catalog item not found.');
      data.catalogItemId = item.id;
      change('catalogItem', food.catalogItem.name, item.name);
    }

    let unit = food.measurementUnit;
    if (dto.measurementUnitId !== undefined && dto.measurementUnitId !== food.measurementUnitId) {
      const found = await tx.measurementUnit.findUnique({ where: { id: dto.measurementUnitId } });
      if (!found) throw badRequest(INVALID_MEASUREMENT_UNIT, 'Measurement unit not found.');
      unit = found;
      data.measurementUnitId = found.id;
      change('measurementUnit', food.measurementUnit.name, found.name);
    }

    if (dto.requestType !== undefined && dto.requestType !== food.requestType) {
      data.requestType = dto.requestType;
      change('requestType', food.requestType, dto.requestType);
    }

    if (dto.quantity !== undefined && !food.quantity.equals(dto.quantity)) {
      data.quantity = dto.quantity;
      change('quantity', food.quantity.toNumber(), dto.quantity);
    }

    if (
      dto.quantity !== undefined ||
      dto.measurementUnitId !== undefined ||
      dto.requestType !== undefined
    ) {
      const quantityError = checkFoodQuantity(
        dto.quantity ?? food.quantity.toNumber(),
        unit.allowsFraction,
        dto.requestType ?? food.requestType,
      );
      if (quantityError) {
        throw badRequest(quantityError, 'Quantity is not valid for this unit and request type.');
      }
    }

    if (dto.description !== undefined && dto.description !== food.description) {
      data.description = dto.description;
      change('description', food.description, dto.description);
    }

    if (dto.notes !== undefined && (dto.notes ?? null) !== food.notes) {
      data.notes = dto.notes ?? null;
      change('notes', food.notes, dto.notes ?? null);
    }

    if (dto.expirationDate !== undefined) {
      const expirationDate = new Date(dto.expirationDate);
      if (expirationDate.getTime() !== food.expirationDate.getTime()) {
        // DT26: only a changed date is checked, so an expired food can have other fields fixed.
        if (isExpirationDateInPast(dto.expirationDate)) {
          throw badRequest(EXPIRATION_DATE_IN_PAST, 'Expiration date cannot be in the past.');
        }
        data.expirationDate = expirationDate;
        change('expirationDate', food.expirationDate, expirationDate);
      }
    }

    // The same day keeps the original time; a new day is stored as midnight in Brasília.
    if (dto.publishedAt !== undefined && dto.publishedAt !== dateInBrasilia(food.publishedAt)) {
      if (isAfterTodayInBrasilia(dto.publishedAt)) throw publishedAtInFuture();
      const publishedAt = brasiliaMidnight(dto.publishedAt);
      data.publishedAt = publishedAt;
      change('publishedAt', food.publishedAt, publishedAt);
    }

    return { data, changes };
  }

  private async orderCounts(
    client: Prisma.TransactionClient,
    foodId: number,
  ): Promise<AdminFoodOrderCountsDto> {
    const counts: AdminFoodOrderCountsDto = {
      pending: 0,
      inProgress: 0,
      rejected: 0,
      donated: 0,
      cancelled: 0,
    };
    const [statuses, groups] = await Promise.all([
      client.orderStatus.findMany({ select: { id: true, name: true } }),
      client.order.groupBy({ by: ['statusId'], where: { foodId }, _count: { _all: true } }),
    ]);
    for (const group of groups) {
      const name = statuses.find((status) => status.id === group.statusId)?.name;
      const key = name ? ORDER_KEYS[name] : undefined;
      if (key) counts[key] = group._count._all;
    }
    return counts;
  }

  private toRow(food: FoodRow, ordersInProgress: number): AdminFoodRowDto {
    const { establishment } = food;
    return {
      id: food.id,
      image: this.storage.toUrl(food.image),
      name: food.catalogItem.name,
      category: { id: food.catalogItem.category.id, name: food.catalogItem.category.name },
      quantity: food.quantity.toFixed(2),
      measurementUnit: {
        id: food.measurementUnit.id,
        name: food.measurementUnit.name,
        abbreviation: food.measurementUnit.abbreviation,
        allowsFraction: food.measurementUnit.allowsFraction,
      },
      requestType: food.requestType,
      status: food.status.name,
      deleted: food.deleted,
      ordersInProgress,
      establishment: {
        id: establishment.id,
        publicName: publicName(establishment.tradeName, establishment.companyName),
        companyName: establishment.companyName,
        deleted: establishment.deleted,
      },
      expirationDate: food.expirationDate,
      publishedAt: food.publishedAt,
    };
  }
}

function editTarget(food: {
  catalogItemId: number;
  measurementUnitId: number;
  requestType: FoodEditTarget['requestType'];
  quantity: Prisma.Decimal;
}): FoodEditTarget {
  return {
    catalogItemId: food.catalogItemId,
    measurementUnitId: food.measurementUnitId,
    requestType: food.requestType,
    quantity: food.quantity.toNumber(),
  };
}

function badRequest(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ code, message });
}

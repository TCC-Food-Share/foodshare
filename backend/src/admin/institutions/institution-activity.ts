import { publicName } from '../../common/institution-public';
import { DEFAULT_PAGE_SIZE } from '../../common/pagination';
import { FOOD_STATUS } from '../../foods/foods.constants';
import { INSTITUTION_KIND, type InstitutionKind } from '../../institutions/institution-kind';
import { ORDER_STATUS } from '../../orders/orders.constants';
import type { PrismaService } from '../../prisma/prisma.service';
import type { Paginated } from '../lists/common/paginate-in-memory';
import type {
  AdminInstitutionFoodDto,
  AdminInstitutionOrderDto,
  AdminPageQueryDto,
  InstitutionActivityDto,
} from './admin-institution.dto';

const FOOD_KEYS = {
  [FOOD_STATUS.ACTIVE]: 'active',
  [FOOD_STATUS.RESERVED]: 'reserved',
  [FOOD_STATUS.INACTIVE]: 'inactive',
} as const;

const ORDER_KEYS = {
  [ORDER_STATUS.PENDING]: 'pending',
  [ORDER_STATUS.IN_PROGRESS]: 'inProgress',
  [ORDER_STATUS.REJECTED]: 'rejected',
  [ORDER_STATUS.DONATED]: 'donated',
  [ORDER_STATUS.CANCELLED]: 'cancelled',
} as const;

const ownerWhere = (kind: InstitutionKind, id: number) =>
  kind === INSTITUTION_KIND.ESTABLISHMENT ? { establishmentId: id } : { beneficiaryEntityId: id };

const pageOf = (query: AdminPageQueryDto) => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize };
};

/** DT51. Counts include soft-deleted rows: the administrator sees everything. */
export async function institutionActivity(
  prisma: PrismaService,
  kind: InstitutionKind,
  id: number,
): Promise<InstitutionActivityDto> {
  const orders: InstitutionActivityDto['orders'] = {
    pending: 0,
    inProgress: 0,
    rejected: 0,
    donated: 0,
    cancelled: 0,
  };
  const [orderStatuses, orderGroups] = await Promise.all([
    prisma.orderStatus.findMany({ select: { id: true, name: true } }),
    prisma.order.groupBy({
      by: ['statusId'],
      where: ownerWhere(kind, id),
      _count: { _all: true },
    }),
  ]);
  for (const group of orderGroups) {
    const name = orderStatuses.find((status) => status.id === group.statusId)?.name;
    const key = ORDER_KEYS[name as keyof typeof ORDER_KEYS];
    if (key) orders[key] = group._count._all;
  }

  if (kind !== INSTITUTION_KIND.ESTABLISHMENT) return { foods: null, orders };

  const foods = { active: 0, reserved: 0, inactive: 0, deleted: 0 };
  const [foodStatuses, foodGroups, deletedFoods] = await Promise.all([
    prisma.foodStatus.findMany({ select: { id: true, name: true } }),
    prisma.food.groupBy({
      by: ['statusId'],
      where: { establishmentId: id, deleted: false },
      _count: { _all: true },
    }),
    prisma.food.count({ where: { establishmentId: id, deleted: true } }),
  ]);
  for (const group of foodGroups) {
    const name = foodStatuses.find((status) => status.id === group.statusId)?.name;
    const key = FOOD_KEYS[name as keyof typeof FOOD_KEYS];
    if (key) foods[key] = group._count._all;
  }
  foods.deleted = deletedFoods;

  return { foods, orders };
}

export async function institutionFoods(
  prisma: PrismaService,
  establishmentId: number,
  query: AdminPageQueryDto,
): Promise<Paginated<AdminInstitutionFoodDto>> {
  const { page, pageSize, skip } = pageOf(query);
  const where = { establishmentId };
  const [rows, total] = await Promise.all([
    prisma.food.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip,
      take: pageSize,
      select: {
        id: true,
        quantity: true,
        expirationDate: true,
        deleted: true,
        catalogItem: { select: { name: true } },
        measurementUnit: { select: { abbreviation: true } },
        status: { select: { name: true } },
      },
    }),
    prisma.food.count({ where }),
  ]);
  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.catalogItem.name,
      quantity: Number(row.quantity),
      unit: row.measurementUnit.abbreviation,
      expirationDate: row.expirationDate,
      status: row.status.name,
      deleted: row.deleted,
    })),
    total,
    page,
    pageSize,
  };
}

export async function institutionOrders(
  prisma: PrismaService,
  kind: InstitutionKind,
  id: number,
  query: AdminPageQueryDto,
): Promise<Paginated<AdminInstitutionOrderDto>> {
  const { page, pageSize, skip } = pageOf(query);
  const where = ownerWhere(kind, id);
  const counterpart = { select: { companyName: true, tradeName: true } };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      skip,
      take: pageSize,
      select: {
        id: true,
        quantity: true,
        orderDate: true,
        deleted: true,
        status: { select: { name: true } },
        food: {
          select: {
            catalogItem: { select: { name: true } },
            measurementUnit: { select: { abbreviation: true } },
          },
        },
        establishment: counterpart,
        beneficiaryEntity: counterpart,
      },
    }),
    prisma.order.count({ where }),
  ]);
  return {
    data: rows.map((row) => {
      const other =
        kind === INSTITUTION_KIND.ESTABLISHMENT ? row.beneficiaryEntity : row.establishment;
      return {
        id: row.id,
        foodName: row.food.catalogItem.name,
        counterpartName: publicName(other.tradeName, other.companyName),
        quantity: Number(row.quantity),
        unit: row.food.measurementUnit.abbreviation,
        orderDate: row.orderDate,
        status: row.status.name,
        deleted: row.deleted,
      };
    }),
    total,
    page,
    pageSize,
  };
}

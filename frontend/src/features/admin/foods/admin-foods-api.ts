import { useQuery } from '@tanstack/react-query';

import type { AdminListParams, Paginated } from '@/features/admin/lists/list-api';
import type { CatalogFoodItem, MeasurementUnit } from '@/features/catalog/catalog-api';
import { FOOD_QUANTITY_MESSAGES } from '@/features/foods/food-quantity';
import type { FoodRequestType } from '@/features/foods/food-request-type';
import { FOOD_STATUS } from '@/features/foods/food-status';
import { api } from '@/lib/api';
import { toFormData } from '@/lib/form-data';

export const ADMIN_FOODS_PATH = '/admin/alimentos';

export const adminFoodPath = (id: number) => `${ADMIN_FOODS_PATH}/${id}`;

export interface AdminFoodRow {
  id: number;
  image: string | null;
  name: string;
  category: { id: number; name: string };
  quantity: string;
  measurementUnit: { id: number; name: string; abbreviation: string; allowsFraction: boolean };
  requestType: FoodRequestType;
  status: string;
  deleted: boolean;
  ordersInProgress: number;
  establishment: { id: number; publicName: string; companyName: string; deleted: boolean };
  expirationDate: string;
  publishedAt: string;
}

export interface AdminFoodOrderCounts {
  pending: number;
  inProgress: number;
  rejected: number;
  donated: number;
  cancelled: number;
}

export interface AdminFoodDetail extends AdminFoodRow {
  catalogItemId: number;
  description: string;
  notes: string | null;
  orders: AdminFoodOrderCounts;
}

/** The fields of RF50 the administrator changed; an empty `notes` clears it. */
export interface AdminFoodChanges {
  catalogItemId?: number;
  measurementUnitId?: number;
  requestType?: FoodRequestType;
  quantity?: number;
  description?: string;
  notes?: string;
  expirationDate?: string;
  publishedAt?: string;
}

export type AdminFoodImpactTarget = Pick<
  AdminFoodChanges,
  'catalogItemId' | 'measurementUnitId' | 'requestType' | 'quantity'
>;

export interface AdminFoodEditImpact {
  ordersToUpdate: number;
  ordersToReject: number;
}

const BASE = '/admin/foods';

export const ADMIN_FOODS_QUERY_KEY = ['admin', 'foods'] as const;

export const adminFoodsApi = {
  list: (params: AdminListParams) => api.get<Paginated<AdminFoodRow>>(BASE, { query: params }),
  get: (id: number) => api.get<AdminFoodDetail>(`${BASE}/${id}`),
  editImpact: (id: number, target: AdminFoodImpactTarget) =>
    api.get<AdminFoodEditImpact>(`${BASE}/${id}/edit-impact`, { query: { ...target } }),
  update: (id: number, changes: AdminFoodChanges, image: File | null) =>
    api.patch<AdminFoodDetail>(
      `${BASE}/${id}`,
      toFormData(changes, { image }, { keepEmpty: ['notes'] }),
    ),
  /** RF51, DT59: the food and every order of it. */
  remove: (id: number) => api.delete(`${BASE}/${id}`),
};

// `/catalog/*` belongs to the institutions; the panel reads the same lists from `/admin/*`.
export const useAdminFoodItemOptions = () =>
  useQuery({
    queryKey: ['admin', 'food-items', 'options'],
    queryFn: () => api.get<CatalogFoodItem[]>('/admin/food-items/options'),
  });

export const useAdminMeasurementUnitOptions = () =>
  useQuery({
    queryKey: ['admin', 'measurement-units', 'options'],
    queryFn: () => api.get<MeasurementUnit[]>('/admin/measurement-units/options'),
  });

/** DT57: only an active food, not deleted and without an order in progress, can be edited. */
export const isEditable = (food: AdminFoodRow) =>
  !food.deleted && food.status === FOOD_STATUS.ACTIVE && food.ordersInProgress === 0;

export const NOT_EDITABLE_MESSAGE =
  'Só alimentos ativos, não excluídos e sem pedido em andamento podem ser editados.';

export const ADMIN_FOOD_ERROR_MESSAGES: Record<string, string> = {
  FOOD_DELETED: 'Este alimento foi excluído e não pode mais ser editado.',
  FOOD_NOT_ACTIVE: 'Este alimento não está mais ativo e não pode ser editado.',
  FOOD_HAS_ORDERS_IN_PROGRESS:
    'Este alimento tem um pedido em andamento e não pode ser editado até ele terminar.',
  FRACTION_NOT_ALLOWED: FOOD_QUANTITY_MESSAGES.FRACTION_NOT_ALLOWED,
  PARTIAL_ONLY_QUANTITY_TOO_LOW: FOOD_QUANTITY_MESSAGES.PARTIAL_ONLY_QUANTITY_TOO_LOW,
  EXPIRATION_DATE_IN_PAST: 'A data de vencimento não pode ser anterior a hoje.',
  PUBLISHED_AT_IN_FUTURE: 'A data de publicação não pode ser posterior a hoje.',
  INVALID_CATALOG_ITEM: 'Selecione um alimento da lista.',
  INVALID_MEASUREMENT_UNIT: 'Selecione uma unidade da lista.',
};

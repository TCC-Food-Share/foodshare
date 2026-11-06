import type { AdminListParams, Paginated } from '@/features/admin/lists/list-api';
import type { FoodStatusName } from '@/features/foods/food-status';
import type { FoodListItem } from '@/features/foods/foods-api';
import { api } from '@/lib/api';

export interface MyFood extends FoodListItem {
  pendingOrders: number;
  inProgressOrders: number;
}

export interface QuantityImpact {
  totalOrdersToUpdate: number;
  partialOrdersToReject: number;
}

export interface UpdateFoodPayload {
  expirationDate?: string;
  quantity?: number;
}

export interface ReactivateFoodPayload {
  expirationDate: string;
  quantity: number;
}

export const MY_FOODS_REFETCH_INTERVAL = 30_000;

export const listMyFoods = (params: AdminListParams & { status?: FoodStatusName }) =>
  api.get<Paginated<MyFood>>('/foods/mine', { query: params });

export const getQuantityImpact = (id: number, quantity: number) =>
  api.get<QuantityImpact>(`/foods/mine/${id}/quantity-impact`, { query: { quantity } });

export const updateFood = (id: number, payload: UpdateFoodPayload) =>
  api.patch<MyFood>(`/foods/${id}`, payload);

export const deactivateFood = (id: number) => api.patch<MyFood>(`/foods/${id}/deactivate`);

export const reactivateFood = (id: number, payload: ReactivateFoodPayload) =>
  api.patch<MyFood>(`/foods/${id}/reactivate`, payload);

export const deleteFood = (id: number, cancellationReasonId?: number) =>
  api.delete(`/foods/${id}`, { query: { cancellationReasonId } });

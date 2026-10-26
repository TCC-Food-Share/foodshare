import type { MeasurementUnit } from '@/features/catalog/catalog-api';
import type { FoodRequestType } from '@/features/foods/food-request-type';
import { api } from '@/lib/api';
import { toFormData } from '@/lib/form-data';

export interface FoodListItem {
  id: number;
  image: string | null;
  name: string;
  quantity: string;
  measurementUnit: MeasurementUnit;
  requestType: FoodRequestType;
  description: string;
  notes: string | null;
  expirationDate: string;
  publishedAt: string;
  category: { id: number; name: string };
  status: { id: number; name: string };
  establishment: {
    id: number;
    companyName: string;
    tradeName: string | null;
    city: string;
    state: string;
  };
}

export interface PaginatedFoods {
  data: FoodListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FoodFilters {
  [key: string]: string | number | undefined;
  name?: string;
  categoryId?: number;
  city?: string;
  state?: string;
  page?: number;
}

export interface CreateFoodPayload {
  catalogItemId: number;
  description: string;
  quantity: number;
  measurementUnitId: number;
  requestType: FoodRequestType;
  expirationDate: string;
  notes?: string;
}

export const listFoods = (filters: FoodFilters) =>
  api.get<PaginatedFoods>('/foods', { query: filters });

export const getFood = (id: number) => api.get<FoodListItem>(`/foods/${id}`);

export const createFood = (payload: CreateFoodPayload, image: File) =>
  api.post<FoodListItem>('/foods', toFormData(payload, { image }));

export const establishmentDisplayName = (establishment: FoodListItem['establishment']) =>
  establishment.tradeName ?? establishment.companyName;

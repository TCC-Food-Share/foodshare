import { api } from '@/lib/api';

export interface FoodListItem {
  id: number;
  image: string | null;
  name: string;
  quantity: string;
  quantityUnit: string;
  description: string;
  expirationDate: string;
  publishedAt: string;
  category: { id: number; name: string };
  status: { id: number; name: string };
  establishment: { id: number; companyName: string; city?: string; state?: string };
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
  name: string;
  categoryId: number;
  description: string;
  quantity: number;
  quantityUnit: string;
  expirationDate: string;
  image?: string;
}

export const listFoods = (filters: FoodFilters) =>
  api.get<PaginatedFoods>('/foods', { query: filters });

export const getFood = (id: number) => api.get<FoodListItem>(`/foods/${id}`);

export const createFood = (payload: CreateFoodPayload) => api.post<FoodListItem>('/foods', payload);

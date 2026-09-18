import { api } from '@/lib/api';

export interface Category {
  id: number;
  name: string;
}

export const listCategories = () => api.get<Category[]>('/categories');

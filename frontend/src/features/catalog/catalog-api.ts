import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface CatalogFoodItem {
  id: number;
  name: string;
  category: { id: number; name: string };
}

export interface MeasurementUnit {
  id: number;
  name: string;
  abbreviation: string;
  allowsFraction: boolean;
}

const CATALOG_STALE_TIME = 30 * 60_000;

export const listFoodItems = () => api.get<CatalogFoodItem[]>('/catalog/food-items');

export const listMeasurementUnits = () => api.get<MeasurementUnit[]>('/catalog/measurement-units');

export const useFoodItems = () =>
  useQuery({
    queryKey: ['catalog', 'food-items'],
    queryFn: listFoodItems,
    staleTime: CATALOG_STALE_TIME,
  });

export const useMeasurementUnits = () =>
  useQuery({
    queryKey: ['catalog', 'measurement-units'],
    queryFn: listMeasurementUnits,
    staleTime: CATALOG_STALE_TIME,
  });

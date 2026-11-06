// Mirrors FOOD_STATUS in backend/src/foods/foods.constants.ts — keep in sync.
export const FOOD_STATUS = {
  ACTIVE: 'Ativo',
  RESERVED: 'Reservado',
  INACTIVE: 'Inativo',
} as const;

export type FoodStatusName = (typeof FOOD_STATUS)[keyof typeof FOOD_STATUS];

export const FOOD_STATUSES: FoodStatusName[] = [
  FOOD_STATUS.ACTIVE,
  FOOD_STATUS.RESERVED,
  FOOD_STATUS.INACTIVE,
];

export function isFoodStatus(value: unknown): value is FoodStatusName {
  return FOOD_STATUSES.some((status) => status === value);
}

export const FOOD_STATUS_STYLES: Record<FoodStatusName, { badge: string; dot: string }> = {
  [FOOD_STATUS.ACTIVE]: {
    badge: 'border-green-600/25 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    dot: 'bg-green-600 dark:bg-green-400',
  },
  [FOOD_STATUS.RESERVED]: {
    badge: 'border-warning/30 bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  [FOOD_STATUS.INACTIVE]: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};

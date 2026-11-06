export const FOOD_STATUS = {
  ACTIVE: 'Ativo',
  RESERVED: 'Reservado',
  INACTIVE: 'Inativo',
} as const;

export const FOOD_STATUS_NAMES = Object.values(FOOD_STATUS);

export const INVALID_CATALOG_ITEM = 'INVALID_CATALOG_ITEM';
export const INVALID_MEASUREMENT_UNIT = 'INVALID_MEASUREMENT_UNIT';
export const FRACTION_NOT_ALLOWED = 'FRACTION_NOT_ALLOWED';
export const PARTIAL_ONLY_QUANTITY_TOO_LOW = 'PARTIAL_ONLY_QUANTITY_TOO_LOW';
export const FOOD_NOT_ACTIVE = 'FOOD_NOT_ACTIVE';
export const FOOD_NOT_INACTIVE = 'FOOD_NOT_INACTIVE';
export const FOOD_HAS_ORDERS_IN_PROGRESS = 'FOOD_HAS_ORDERS_IN_PROGRESS';
export const EXPIRATION_DATE_IN_PAST = 'EXPIRATION_DATE_IN_PAST';
export const CANCELLATION_REASON_REQUIRED = 'CANCELLATION_REASON_REQUIRED';
export const INVALID_CANCELLATION_REASON = 'INVALID_CANCELLATION_REASON';

// Largest value that fits food.quantity, a Decimal(10, 2) column.
export const MAX_FOOD_QUANTITY = 99_999_999.99;

export const MY_FOODS_SORT_FIELDS = [
  'name',
  'category',
  'quantity',
  'expirationDate',
  'publishedAt',
] as const;

export type MyFoodsSortField = (typeof MY_FOODS_SORT_FIELDS)[number];

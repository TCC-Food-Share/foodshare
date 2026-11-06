import { FRACTION_NOT_ALLOWED } from '../foods/foods.constants';

export const ORDER_STATUS = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  REJECTED: 'Rejeitado',
  DONATED: 'Doado',
  CANCELLED: 'Cancelado',
} as const;

export const ORDER_STATUS_NAMES = Object.values(ORDER_STATUS);

export const OPEN_ORDER_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.IN_PROGRESS];

export const ORDER_CONFLICT_CODES = {
  limitReached: 'ORDERS_IN_PROGRESS_LIMIT_REACHED',
  duplicateInProgress: 'DUPLICATE_ORDER_IN_PROGRESS',
  notPending: 'ORDER_NOT_PENDING',
  notInProgress: 'ORDER_NOT_IN_PROGRESS',
  foodNotAvailable: 'FOOD_NOT_AVAILABLE',
  insufficientQuantity: 'INSUFFICIENT_FOOD_QUANTITY',
} as const;

export const ORDER_QUANTITY_CODES = {
  exceedsAvailable: 'QUANTITY_EXCEEDS_AVAILABLE',
  fractionNotAllowed: FRACTION_NOT_ALLOWED,
  totalRequired: 'TOTAL_QUANTITY_REQUIRED',
  partialRequired: 'PARTIAL_QUANTITY_REQUIRED',
} as const;

export type OrderQuantityCode = (typeof ORDER_QUANTITY_CODES)[keyof typeof ORDER_QUANTITY_CODES];

export const DEFAULT_PAGE = 1;

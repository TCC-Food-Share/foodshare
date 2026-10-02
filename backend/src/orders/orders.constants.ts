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
} as const;

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

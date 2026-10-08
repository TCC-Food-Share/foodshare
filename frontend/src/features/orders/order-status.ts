// Mirrors ORDER_STATUS in backend/src/orders/orders.constants.ts — keep in sync.
export const ORDER_STATUS = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  REJECTED: 'Rejeitado',
  DONATED: 'Doado',
  CANCELLED: 'Cancelado',
} as const;

export type OrderStatusName = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUSES: OrderStatusName[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.REJECTED,
  ORDER_STATUS.DONATED,
  ORDER_STATUS.CANCELLED,
];

export const OPEN_ORDER_STATUSES: OrderStatusName[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.IN_PROGRESS,
];

export function isOrderStatus(value: unknown): value is OrderStatusName {
  return ORDER_STATUSES.some((status) => status === value);
}

export const ORDER_STATUS_STYLES: Record<OrderStatusName, { badge: string; dot: string }> = {
  [ORDER_STATUS.PENDING]: {
    badge: 'border-primary/20 bg-primary/10 text-primary dark:text-blue-400',
    dot: 'bg-primary dark:bg-blue-400',
  },
  [ORDER_STATUS.IN_PROGRESS]: {
    badge: 'border-warning/30 bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  [ORDER_STATUS.REJECTED]: {
    badge: 'border-destructive/25 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  [ORDER_STATUS.DONATED]: {
    badge: 'border-green-600/25 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    dot: 'bg-green-600 dark:bg-green-400',
  },
  [ORDER_STATUS.CANCELLED]: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};

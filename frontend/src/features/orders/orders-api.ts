import { api, ApiError } from '@/lib/api';

export type OrderStatusName = 'Pendente' | 'Aceito' | 'Rejeitado' | 'Recebido';

export interface Order {
  id: number;
  quantity: string;
  orderDate: string;
  status: { id: number; name: OrderStatusName };
  food: { id: number; name: string; quantityUnit: string };
  establishment: { id: number; companyName: string };
  beneficiaryEntity: { id: number; companyName: string };
}

export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderPayload {
  foodId: number;
  quantity: number;
}

export const createOrder = (payload: CreateOrderPayload) => api.post<Order>('/orders', payload);

export const listOrdersByStatus = (status: OrderStatusName) =>
  api.get<PaginatedOrders>('/orders', { query: { status, pageSize: 50 } });

// Mirrors ORDER_CONFLICT_CODES in backend/src/orders/orders.constants.ts — keep in sync.
export const ORDER_CONFLICT_CODES = {
  limitReached: 'ORDERS_IN_PROGRESS_LIMIT_REACHED',
  duplicateInProgress: 'DUPLICATE_ORDER_IN_PROGRESS',
} as const;

export function conflictCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined;
  const body = error.body;
  if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') {
    return body.code;
  }
  return undefined;
}

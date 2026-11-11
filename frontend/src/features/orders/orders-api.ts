import type { OrderStatusName } from '@/features/orders/order-status';
import { api, ApiError } from '@/lib/api';

// Mirrors the OrderCancelledBy enum of backend/prisma/schema.prisma — keep in sync.
export type OrderCancelledBy = 'ESTABLISHMENT' | 'BENEFICIARY_ENTITY' | 'ADMINISTRATOR' | 'SYSTEM';

export interface OrderCancellation {
  cancellationReason: { id: number; name: string } | null;
  cancelledBy: OrderCancelledBy | null;
}

export interface Order extends OrderCancellation {
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

export interface OrderInstitution {
  id: number;
  companyName: string;
  tradeName: string | null;
  description: string;
  city: string;
  state: string;
  // Só vêm preenchidos na outra parte e só com o pedido "Em andamento" (RN12).
  institutionalEmail: string | null;
  institutionalPhone: string | null;
  address: OrderAddress | null;
}

export interface OrderAddress {
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
}

export interface OrderDetail extends OrderCancellation {
  id: number;
  quantity: string;
  orderDate: string;
  quantityUpdatedAt: string | null;
  status: { id: number; name: OrderStatusName };
  food: {
    id: number;
    image: string | null;
    name: string;
    quantity: string;
    quantityUnit: string;
    description: string;
    expirationDate: string;
    category: { id: number; name: string };
    status: { id: number; name: string };
  };
  establishment: OrderInstitution;
  beneficiaryEntity: OrderInstitution;
}

export interface CreateOrderPayload {
  foodId: number;
  quantity: number;
}

export interface ListOrdersParams {
  status: OrderStatusName;
  page: number;
  pageSize: number;
  search?: string;
}

export const createOrder = (payload: CreateOrderPayload) => api.post<Order>('/orders', payload);

export const listOrdersByStatus = (status: OrderStatusName) =>
  api.get<PaginatedOrders>('/orders', { query: { status, pageSize: 50 } });

export const listOrders = (params: ListOrdersParams) =>
  api.get<PaginatedOrders>('/orders', {
    query: { ...params, search: params.search || undefined },
  });

export const getOrder = (id: number) => api.get<OrderDetail>(`/orders/${id}`);

export const orderDetailKey = (id: number) => ['orders', 'detail', id] as const;

export const ORDERS_REFETCH_INTERVAL = 30_000;

export interface AcceptImpact {
  pendingOrdersToReject: number;
  totalOrdersToUpdate: number;
  foodWillBeReserved: boolean;
}

export const getAcceptImpact = (id: number) => api.get<AcceptImpact>(`/orders/${id}/accept-impact`);

export const acceptImpactKey = (id: number) => ['order-accept-impact', id] as const;

export const acceptOrder = (id: number) => api.patch<Order>(`/orders/${id}/accept`);

export const rejectOrder = (id: number) => api.patch<Order>(`/orders/${id}/reject`);

export const receiveOrder = (id: number) => api.patch<Order>(`/orders/${id}/receive`);

export const cancelOrder = (id: number, cancellationReasonId: number) =>
  api.patch<Order>(`/orders/${id}/cancel`, { cancellationReasonId });

// Mirrors ORDER_CONFLICT_CODES in backend/src/orders/orders.constants.ts — keep in sync.
export const ORDER_CONFLICT_CODES = {
  limitReached: 'ORDERS_IN_PROGRESS_LIMIT_REACHED',
  duplicateInProgress: 'DUPLICATE_ORDER_IN_PROGRESS',
  notPending: 'ORDER_NOT_PENDING',
  notInProgress: 'ORDER_NOT_IN_PROGRESS',
  foodNotAvailable: 'FOOD_NOT_AVAILABLE',
  insufficientQuantity: 'INSUFFICIENT_FOOD_QUANTITY',
  notOpen: 'ORDER_NOT_OPEN',
} as const;

export function conflictCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined;
  const body = error.body;
  if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') {
    return body.code;
  }
  return undefined;
}

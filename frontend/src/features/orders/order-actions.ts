import type { InstitutionRole, Role } from '@/features/auth/auth-context';
import { ORDER_STATUS, type OrderStatusName } from '@/features/orders/order-status';
import {
  acceptOrder,
  type Order,
  type OrderDetail,
  receiveOrder,
  rejectOrder,
} from '@/features/orders/orders-api';
import { formatQuantity } from '@/lib/format';

export type OrderAction = 'accept' | 'reject' | 'receive';

interface OrderActionConfig {
  label: string;
  expectedStatus: OrderStatusName;
  call: (id: number) => Promise<Order>;
  success: string;
  failure: string;
  destructive: boolean;
}

export const ORDER_ACTIONS: Record<OrderAction, OrderActionConfig> = {
  accept: {
    label: 'Aceitar pedido',
    expectedStatus: ORDER_STATUS.PENDING,
    call: acceptOrder,
    success: 'Pedido aceito. Quantidade reservada.',
    failure: 'aceitar o pedido',
    destructive: false,
  },
  reject: {
    label: 'Rejeitar pedido',
    expectedStatus: ORDER_STATUS.PENDING,
    call: rejectOrder,
    success: 'Pedido rejeitado.',
    failure: 'rejeitar o pedido',
    destructive: true,
  },
  receive: {
    label: 'Confirmar recebimento',
    expectedStatus: ORDER_STATUS.IN_PROGRESS,
    call: receiveOrder,
    success: 'Recebimento confirmado. Pedido encerrado.',
    failure: 'confirmar o recebimento do pedido',
    destructive: false,
  },
};

const ALREADY_UPDATED = 'Este pedido já foi atualizado. Confira a situação atual.';
const NOT_CONCLUDED = 'Não foi possível concluir a ação. O pedido pode ter sido atualizado.';

export function availableActions(role: Role | null, status: OrderStatusName): OrderAction[] {
  if (role === 'establishment' && status === ORDER_STATUS.PENDING) return ['accept', 'reject'];
  if (role === 'beneficiary' && status === ORDER_STATUS.IN_PROGRESS) return ['receive'];
  return [];
}

const SITUATION: Record<InstitutionRole, Record<OrderStatusName, string>> = {
  establishment: {
    [ORDER_STATUS.PENDING]:
      'Este pedido aguarda a sua decisão. Ao aceitar, a quantidade solicitada fica reservada para a entidade.',
    [ORDER_STATUS.IN_PROGRESS]:
      'Você aceitou este pedido. Aguardando a entidade confirmar o recebimento.',
    [ORDER_STATUS.REJECTED]: 'Você rejeitou este pedido.',
    [ORDER_STATUS.DONATED]: 'A entidade confirmou o recebimento. Pedido encerrado.',
    [ORDER_STATUS.CANCELLED]: 'Este pedido foi cancelado.',
  },
  beneficiary: {
    [ORDER_STATUS.PENDING]: 'Aguardando a resposta do estabelecimento.',
    [ORDER_STATUS.IN_PROGRESS]:
      'Pedido em andamento: a quantidade está reservada para a sua entidade. Quando receber o alimento, confirme o recebimento.',
    [ORDER_STATUS.REJECTED]: 'O estabelecimento rejeitou este pedido.',
    [ORDER_STATUS.DONATED]: 'Você confirmou o recebimento. Pedido encerrado.',
    [ORDER_STATUS.CANCELLED]: 'Este pedido foi cancelado.',
  },
};

export function situationText(role: Role | null, status: OrderStatusName): string {
  return SITUATION[role === 'establishment' ? 'establishment' : 'beneficiary'][status];
}

export function insufficientStock(order: OrderDetail): boolean {
  return Number(order.food.quantity) < Number(order.quantity);
}

function withUnit(quantity: string, order: OrderDetail): string {
  return `${formatQuantity(quantity)} ${order.food.quantityUnit}`;
}

export function dialogCopy(
  action: OrderAction,
  order: OrderDetail,
): { title: string; description: string } {
  const requested = withUnit(order.quantity, order);

  if (action === 'accept') {
    const remaining =
      Math.round((Number(order.food.quantity) - Number(order.quantity)) * 100) / 100;
    return {
      title: `Aceitar o pedido #${order.id}?`,
      description: `${requested} de ${order.food.name} ficam reservados para ${order.beneficiaryEntity.companyName}. O estoque disponível passa de ${withUnit(order.food.quantity, order)} para ${withUnit(String(remaining), order)}. Esta ação não pode ser desfeita.`,
    };
  }

  if (action === 'reject') {
    return {
      title: `Rejeitar o pedido #${order.id}?`,
      description:
        'O pedido será encerrado como Rejeitado e o estoque não muda. Esta ação não pode ser desfeita.',
    };
  }

  return {
    title: 'Confirmar o recebimento?',
    description: `Você confirma que recebeu ${requested} de ${order.food.name}. O pedido será encerrado como Doado. Esta ação não pode ser desfeita.`,
  };
}

// Mirrors the 409 causes of accept/reject/receive in backend/src/orders/orders.service.ts — keep in sync.
export function conflictMessage(action: OrderAction, fresh: OrderDetail | null): string {
  if (!fresh) return NOT_CONCLUDED;
  if (fresh.status.name !== ORDER_ACTIONS[action].expectedStatus) return ALREADY_UPDATED;
  if (action !== 'accept') return NOT_CONCLUDED;
  return insufficientStock(fresh)
    ? 'Estoque insuficiente para aceitar este pedido.'
    : 'O alimento deste pedido não está mais disponível (vencido, inativo ou removido). Você ainda pode rejeitar o pedido.';
}

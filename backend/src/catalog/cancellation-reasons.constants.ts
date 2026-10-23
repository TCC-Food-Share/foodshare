export const SYSTEM_CANCELLATION_REASON = {
  ACCOUNT_CLOSED: 'Conta encerrada pela instituição',
  ORDER_EXPIRED: 'Pedido expirado sem resposta',
  FOOD_EXPIRED: 'Alimento vencido',
} as const;

export const SYSTEM_CANCELLATION_REASON_NAMES = Object.values(SYSTEM_CANCELLATION_REASON);

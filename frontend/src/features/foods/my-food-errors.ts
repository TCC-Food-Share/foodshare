import { ApiError, isTooManyRequests } from '@/lib/api';

const MESSAGES: Record<string, string> = {
  FOOD_NOT_ACTIVE: 'Este alimento não está mais ativo.',
  FOOD_NOT_INACTIVE: 'Este alimento não está mais inativo.',
  FOOD_HAS_ORDERS_IN_PROGRESS:
    'Este alimento passou a ter um pedido em andamento. Não é possível continuar.',
  CANCELLATION_REASON_REQUIRED:
    'Este alimento passou a ter um pedido em andamento. Escolha o motivo do cancelamento.',
  INVALID_CANCELLATION_REASON: 'Este motivo não está mais disponível. Escolha outro.',
};

export function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const body = error.body;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? body.code
    : undefined;
}

export function myFoodErrorMessage(error: unknown): string {
  const code = apiErrorCode(error);
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (error instanceof ApiError && error.status === 404) {
    return 'Este alimento não existe mais.';
  }
  if (isTooManyRequests(error)) {
    return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.';
  }
  return 'Não foi possível concluir a ação. Tente novamente em instantes.';
}

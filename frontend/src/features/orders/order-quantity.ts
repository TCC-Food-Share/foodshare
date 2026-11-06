import { allowsPartialOrder } from '@/features/foods/food-quantity';
import type { FoodRequestType } from '@/features/foods/food-request-type';
import { QUANTITY_REGEX } from '@/lib/validation';

export type OrderMode = 'total' | 'partial' | 'remainder';

export interface OrderQuantityRules {
  available: number;
  allowsFraction: boolean;
  requestType: FoodRequestType;
}

// Mirrors checkOrderQuantity in backend/src/orders/order-quantity.ts — keep in sync.
export function orderModes({
  available,
  allowsFraction,
  requestType,
}: OrderQuantityRules): OrderMode[] {
  if (requestType === 'TOTAL_ONLY') return ['total'];
  if (requestType === 'PARTIAL_ONLY') {
    return allowsPartialOrder(available, allowsFraction) ? ['partial'] : ['remainder'];
  }
  return ['total', 'partial'];
}

export function partialQuantityError(
  quantity: string,
  { available, allowsFraction, requestType }: OrderQuantityRules,
): string | null {
  if (!quantity) return 'Informe a quantidade.';
  const amount = Number(quantity);
  if (!(amount > 0)) return 'A quantidade deve ser maior que zero.';
  if (!QUANTITY_REGEX.test(quantity)) return 'Use um número com no máximo 2 casas decimais.';
  if (!allowsFraction && !Number.isInteger(amount)) {
    return 'Informe uma quantidade inteira: esta unidade não aceita fração.';
  }
  if (amount > available) return 'A quantidade não pode ser maior que a disponível.';
  if (requestType === 'PARTIAL_ONLY' && amount >= available) {
    return 'Este alimento aceita só pedido parcial: informe menos que a quantidade disponível.';
  }
  return null;
}

import type { FoodRequestType } from '@/features/foods/food-request-type';

export type FoodQuantityError = 'FRACTION_NOT_ALLOWED' | 'PARTIAL_ONLY_QUANTITY_TOO_LOW';

// Mirrors backend/src/foods/food-quantity.ts — keep in sync.
export function checkFoodQuantity(
  quantity: number,
  allowsFraction: boolean,
  requestType: FoodRequestType,
): FoodQuantityError | null {
  if (!allowsFraction && !Number.isInteger(quantity)) return 'FRACTION_NOT_ALLOWED';

  const step = allowsFraction ? 0.01 : 1;
  if (requestType === 'PARTIAL_ONLY' && quantity <= step) return 'PARTIAL_ONLY_QUANTITY_TOO_LOW';
  return null;
}

export const FOOD_QUANTITY_MESSAGES: Record<FoodQuantityError, string> = {
  FRACTION_NOT_ALLOWED: 'Esta unidade não aceita quantidade fracionada.',
  PARTIAL_ONLY_QUANTITY_TOO_LOW:
    'Com "Somente parcial", a quantidade precisa permitir um pedido menor que o total.',
};

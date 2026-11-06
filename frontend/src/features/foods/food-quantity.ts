import type { FoodRequestType } from '@/features/foods/food-request-type';

export type FoodQuantityError = 'FRACTION_NOT_ALLOWED' | 'PARTIAL_ONLY_QUANTITY_TOO_LOW';

// Mirrors backend/src/foods/food-quantity.ts — keep in sync.
export function quantityStep(allowsFraction: boolean): number {
  return allowsFraction ? 0.01 : 1;
}

export function allowsPartialOrder(available: number, allowsFraction: boolean): boolean {
  return available > quantityStep(allowsFraction);
}

export function checkFoodQuantity(
  quantity: number,
  allowsFraction: boolean,
  requestType: FoodRequestType,
): FoodQuantityError | null {
  if (!allowsFraction && !Number.isInteger(quantity)) return 'FRACTION_NOT_ALLOWED';

  if (requestType === 'PARTIAL_ONLY' && !allowsPartialOrder(quantity, allowsFraction)) {
    return 'PARTIAL_ONLY_QUANTITY_TOO_LOW';
  }
  return null;
}

// Mirrors MAX_FOOD_QUANTITY in backend/src/foods/foods.constants.ts — keep in sync.
export const MAX_FOOD_QUANTITY = 99_999_999.99;

export const QUANTITY_TOO_LARGE_MESSAGE = 'A quantidade máxima é 99.999.999,99.';

export const FOOD_QUANTITY_MESSAGES: Record<FoodQuantityError, string> = {
  FRACTION_NOT_ALLOWED: 'Esta unidade não aceita quantidade fracionada.',
  PARTIAL_ONLY_QUANTITY_TOO_LOW:
    'Com "Somente parcial", a quantidade precisa permitir um pedido menor que o total.',
};

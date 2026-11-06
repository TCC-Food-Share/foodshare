import { FoodRequestType } from '../../generated/prisma/client';
import { FRACTION_NOT_ALLOWED, PARTIAL_ONLY_QUANTITY_TOO_LOW } from './foods.constants';

export type FoodQuantityError = typeof FRACTION_NOT_ALLOWED | typeof PARTIAL_ONLY_QUANTITY_TOO_LOW;

const FRACTION_STEP = 0.01;
const WHOLE_STEP = 1;

export function quantityStep(allowsFraction: boolean): number {
  return allowsFraction ? FRACTION_STEP : WHOLE_STEP;
}

export function allowsPartialOrder(available: number, allowsFraction: boolean): boolean {
  return available > quantityStep(allowsFraction);
}

export function checkFoodQuantity(
  quantity: number,
  allowsFraction: boolean,
  requestType: FoodRequestType,
): FoodQuantityError | null {
  if (!allowsFraction && !Number.isInteger(quantity)) return FRACTION_NOT_ALLOWED;

  if (
    requestType === FoodRequestType.PARTIAL_ONLY &&
    !allowsPartialOrder(quantity, allowsFraction)
  ) {
    return PARTIAL_ONLY_QUANTITY_TOO_LOW;
  }
  return null;
}

import { FoodRequestType, OrderType, Prisma } from '../../generated/prisma/client';
import { allowsPartialOrder } from '../foods/food-quantity';
import { ORDER_QUANTITY_CODES, type OrderQuantityCode } from './orders.constants';

export function checkOrderQuantity(
  quantity: number,
  available: Prisma.Decimal,
  allowsFraction: boolean,
  requestType: FoodRequestType,
): OrderQuantityCode | null {
  if (available.lessThan(quantity)) return ORDER_QUANTITY_CODES.exceedsAvailable;
  if (!allowsFraction && !Number.isInteger(quantity))
    return ORDER_QUANTITY_CODES.fractionNotAllowed;

  const wholeStock = available.equals(quantity);
  if (requestType === FoodRequestType.TOTAL_ONLY && !wholeStock) {
    return ORDER_QUANTITY_CODES.totalRequired;
  }
  if (
    requestType === FoodRequestType.PARTIAL_ONLY &&
    wholeStock &&
    allowsPartialOrder(available.toNumber(), allowsFraction)
  ) {
    return ORDER_QUANTITY_CODES.partialRequired;
  }
  return null;
}

export function orderTypeFor(
  quantity: number,
  available: Prisma.Decimal,
  requestType: FoodRequestType,
): OrderType {
  if (requestType === FoodRequestType.PARTIAL_ONLY) return OrderType.PARTIAL;
  return available.equals(quantity) ? OrderType.TOTAL : OrderType.PARTIAL;
}

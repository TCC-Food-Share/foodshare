import { z } from 'zod';

import {
  checkFoodQuantity,
  FOOD_QUANTITY_MESSAGES,
  MAX_FOOD_QUANTITY,
  QUANTITY_TOO_LARGE_MESSAGE,
} from '@/features/foods/food-quantity';
import type { MyFood } from '@/features/foods/my-foods-api';
import { QUANTITY_REGEX } from '@/lib/validation';

export const EXPIRATION_IN_PAST_MESSAGE = 'A data de validade não pode estar no passado.';

// The backend compares expiration dates with the current UTC day.
export const todayUtcIso = () => new Date().toISOString().slice(0, 10);

export const expirationIsoOf = (food: MyFood) => food.expirationDate.slice(0, 10);

export function createFoodStockSchema(food: MyFood, allowCurrentExpiration: boolean) {
  const current = expirationIsoOf(food);

  return z.object({
    expirationDate: z
      .string()
      .min(1, 'Informe a data de validade.')
      .refine(
        (value) => value >= todayUtcIso() || (allowCurrentExpiration && value === current),
        EXPIRATION_IN_PAST_MESSAGE,
      ),
    quantity: z
      .string()
      .min(1, 'Informe a quantidade.')
      .refine((value) => Number(value) > 0, 'A quantidade deve ser maior que zero.')
      .refine((value) => Number(value) <= MAX_FOOD_QUANTITY, QUANTITY_TOO_LARGE_MESSAGE)
      .refine((value) => QUANTITY_REGEX.test(value), 'No máximo 2 casas decimais.')
      .superRefine((value, ctx) => {
        if (!(Number(value) > 0) || !QUANTITY_REGEX.test(value)) return;
        const error = checkFoodQuantity(
          Number(value),
          food.measurementUnit.allowsFraction,
          food.requestType,
        );
        if (error) ctx.addIssue({ code: 'custom', message: FOOD_QUANTITY_MESSAGES[error] });
      }),
  });
}

export type FoodStockValues = z.infer<ReturnType<typeof createFoodStockSchema>>;

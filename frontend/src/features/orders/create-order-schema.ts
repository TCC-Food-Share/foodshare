import { z } from 'zod';

import {
  type OrderMode,
  orderModes,
  type OrderQuantityRules,
  partialQuantityError,
} from '@/features/orders/order-quantity';

export function createOrderSchema(rules: OrderQuantityRules) {
  return z
    .object({
      mode: z.enum(['total', 'partial', 'remainder']),
      quantity: z.string(),
    })
    .superRefine(({ mode, quantity }, ctx) => {
      if (mode !== 'partial') return;
      const message = partialQuantityError(quantity, rules);
      if (message) ctx.addIssue({ code: 'custom', message, path: ['quantity'] });
    });
}

export type CreateOrderInput = z.infer<ReturnType<typeof createOrderSchema>>;

export function defaultValues(rules: OrderQuantityRules): CreateOrderInput {
  const mode: OrderMode = orderModes(rules)[0];
  return { mode, quantity: '' };
}

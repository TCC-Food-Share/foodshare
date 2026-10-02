import { z } from 'zod';

import { QUANTITY_REGEX } from '@/lib/validation';

function quantityError(quantity: string, available: number): string | null {
  if (!quantity) return 'Informe a quantidade.';
  const amount = Number(quantity);
  if (!(amount > 0)) return 'A quantidade deve ser maior que zero.';
  if (!QUANTITY_REGEX.test(quantity)) return 'Use um número com no máximo 2 casas decimais.';
  if (amount > available) return 'A quantidade não pode ser maior que a disponível.';
  return null;
}

export function createOrderSchema(available: number) {
  return z
    .object({
      mode: z.enum(['total', 'partial']),
      quantity: z.string(),
    })
    .superRefine(({ mode, quantity }, ctx) => {
      if (mode === 'total') return;
      const message = quantityError(quantity, available);
      if (message) ctx.addIssue({ code: 'custom', message, path: ['quantity'] });
    });
}

export type CreateOrderInput = z.infer<ReturnType<typeof createOrderSchema>>;

export const DEFAULT_VALUES: CreateOrderInput = { mode: 'total', quantity: '' };

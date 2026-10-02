import { z } from 'zod';

import { QUANTITY_REGEX } from '@/lib/validation';

export const createFoodSchema = z.object({
  name: z.string().min(1, 'Informe o nome do alimento.').max(200),
  categoryId: z.string().min(1, 'Selecione a categoria.'),
  description: z.string().min(1, 'Descreva o alimento.').max(2000),
  quantity: z
    .string()
    .min(1, 'Informe a quantidade.')
    .refine((v) => Number(v) > 0, 'A quantidade deve ser maior que zero.')
    .refine((v) => QUANTITY_REGEX.test(v), 'No máximo 2 casas decimais.'),
  quantityUnit: z.string().min(1, 'Informe a unidade de medida.').max(50),
  expirationDate: z.string().min(1, 'Informe a data de vencimento.'),
  image: z.string().min(1, 'Informe a URL da imagem.').max(500),
});

export type CreateFoodInput = z.infer<typeof createFoodSchema>;

export const DEFAULT_VALUES: CreateFoodInput = {
  name: '',
  categoryId: '',
  description: '',
  quantity: '',
  quantityUnit: '',
  expirationDate: '',
  image: '',
};

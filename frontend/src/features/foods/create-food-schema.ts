import { z } from 'zod';

import type { MeasurementUnit } from '@/features/catalog/catalog-api';
import { imageFileSchema } from '@/features/files/image-rules';
import {
  checkFoodQuantity,
  FOOD_QUANTITY_MESSAGES,
  type FoodQuantityError,
} from '@/features/foods/food-quantity';
import { FOOD_REQUEST_TYPES } from '@/features/foods/food-request-type';
import { QUANTITY_REGEX } from '@/lib/validation';

export const FOOD_IMAGE_REQUIRED = 'Envie uma imagem do alimento.';

const baseSchema = z.object({
  catalogItemId: z.string().min(1, 'Selecione o alimento.'),
  description: z.string().trim().min(1, 'Descreva o alimento.').max(2000),
  quantity: z
    .string()
    .min(1, 'Informe a quantidade.')
    .refine((v) => Number(v) > 0, 'A quantidade deve ser maior que zero.')
    .refine((v) => QUANTITY_REGEX.test(v), 'No máximo 2 casas decimais.'),
  measurementUnitId: z.string().min(1, 'Selecione a unidade de medida.'),
  requestType: z.enum(FOOD_REQUEST_TYPES, { error: 'Escolha o tipo de solicitação.' }),
  expirationDate: z.string().min(1, 'Informe a data de vencimento.'),
  notes: z.string().max(2000),
  image: z.instanceof(File, { error: FOOD_IMAGE_REQUIRED }).pipe(imageFileSchema),
});

const quantityFields = baseSchema.pick({
  quantity: true,
  measurementUnitId: true,
  requestType: true,
});

export function createFoodSchema(units: MeasurementUnit[]) {
  const quantityError = (values: z.infer<typeof quantityFields>): FoodQuantityError | null => {
    const unit = units.find((item) => String(item.id) === values.measurementUnitId);
    if (!unit) return null;
    return checkFoodQuantity(Number(values.quantity), unit.allowsFraction, values.requestType);
  };
  const quantityFieldsValid = (payload: { value: unknown }) =>
    quantityFields.safeParse(payload.value).success;

  return baseSchema
    .refine((values) => quantityError(values) !== 'FRACTION_NOT_ALLOWED', {
      message: FOOD_QUANTITY_MESSAGES.FRACTION_NOT_ALLOWED,
      path: ['quantity'],
      when: quantityFieldsValid,
    })
    .refine((values) => quantityError(values) !== 'PARTIAL_ONLY_QUANTITY_TOO_LOW', {
      message: FOOD_QUANTITY_MESSAGES.PARTIAL_ONLY_QUANTITY_TOO_LOW,
      path: ['quantity'],
      when: quantityFieldsValid,
    });
}

export type CreateFoodInput = z.input<ReturnType<typeof createFoodSchema>>;

export const DEFAULT_VALUES: CreateFoodInput = {
  catalogItemId: '',
  description: '',
  quantity: '',
  measurementUnitId: '',
  requestType: 'TOTAL_OR_PARTIAL',
  expirationDate: '',
  notes: '',
  image: undefined as unknown as File,
};

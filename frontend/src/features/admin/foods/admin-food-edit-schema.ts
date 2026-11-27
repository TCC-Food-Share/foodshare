import { z } from 'zod';

import type { AdminFoodChanges, AdminFoodDetail } from '@/features/admin/foods/admin-foods-api';
import type { MeasurementUnit } from '@/features/catalog/catalog-api';
import { imageFileSchema } from '@/features/files/image-rules';
import {
  checkFoodQuantity,
  FOOD_QUANTITY_MESSAGES,
  type FoodQuantityError,
  MAX_FOOD_QUANTITY,
  QUANTITY_TOO_LARGE_MESSAGE,
} from '@/features/foods/food-quantity';
import { FOOD_REQUEST_TYPES } from '@/features/foods/food-request-type';
import { EXPIRATION_IN_PAST_MESSAGE, todayUtcIso } from '@/features/foods/food-stock-schema';
import { QUANTITY_REGEX } from '@/lib/validation';

export const PUBLISHED_AT_IN_FUTURE_MESSAGE = 'A data de publicação não pode ser posterior a hoje.';

// The backend checks the publication day in Brasília, the zone the panel is used in.
const todayLocalIso = () => new Date().toLocaleDateString('en-CA');

/** yyyy-mm-dd of the publication instant, in the local zone (as the panel shows it). */
export const publishedDayOf = (food: AdminFoodDetail) =>
  new Date(food.publishedAt).toLocaleDateString('en-CA');

const expirationDayOf = (food: AdminFoodDetail) => food.expirationDate.slice(0, 10);

const baseSchema = z.object({
  catalogItemId: z.string().min(1, 'Selecione o alimento.'),
  description: z.string().trim().min(1, 'Descreva o alimento.').max(2000),
  quantity: z
    .string()
    .min(1, 'Informe a quantidade.')
    .refine((v) => Number(v) > 0, 'A quantidade deve ser maior que zero.')
    .refine((v) => Number(v) <= MAX_FOOD_QUANTITY, QUANTITY_TOO_LARGE_MESSAGE)
    .refine((v) => QUANTITY_REGEX.test(v), 'No máximo 2 casas decimais.'),
  measurementUnitId: z.string().min(1, 'Selecione a unidade de medida.'),
  requestType: z.enum(FOOD_REQUEST_TYPES, { error: 'Escolha o tipo de solicitação.' }),
  expirationDate: z.string().min(1, 'Informe a data de vencimento.'),
  publishedAt: z
    .string()
    .min(1, 'Informe a data de publicação.')
    .refine((value) => value <= todayLocalIso(), PUBLISHED_AT_IN_FUTURE_MESSAGE),
  notes: z.string().max(2000),
  image: imageFileSchema.nullable(),
});

const quantityFields = baseSchema.pick({
  quantity: true,
  measurementUnitId: true,
  requestType: true,
});

/** Mirrors AdminUpdateFoodDto; the expiration date is only checked when changed (DT26). */
export function createAdminFoodEditSchema(food: AdminFoodDetail, units: MeasurementUnit[]) {
  const currentExpiration = expirationDayOf(food);
  const quantityError = (values: z.infer<typeof quantityFields>): FoodQuantityError | null => {
    const unit = units.find((item) => String(item.id) === values.measurementUnitId);
    if (!unit) return null;
    return checkFoodQuantity(Number(values.quantity), unit.allowsFraction, values.requestType);
  };
  const quantityFieldsValid = (payload: { value: unknown }) =>
    quantityFields.safeParse(payload.value).success;

  return baseSchema
    .refine(
      (values) =>
        values.expirationDate === currentExpiration || values.expirationDate >= todayUtcIso(),
      { message: EXPIRATION_IN_PAST_MESSAGE, path: ['expirationDate'] },
    )
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

export type AdminFoodEditInput = z.input<ReturnType<typeof createAdminFoodEditSchema>>;

export function initialValues(food: AdminFoodDetail): AdminFoodEditInput {
  return {
    catalogItemId: String(food.catalogItemId),
    description: food.description,
    quantity: String(Number(food.quantity)),
    measurementUnitId: String(food.measurementUnit.id),
    requestType: food.requestType,
    expirationDate: expirationDayOf(food),
    publishedAt: publishedDayOf(food),
    notes: food.notes ?? '',
    image: null,
  };
}

/** Only what changed goes to the PATCH (RF50: only the fields sent change). */
export function changedFields(initial: AdminFoodEditInput, values: AdminFoodEditInput) {
  const changes: AdminFoodChanges = {};
  if (values.catalogItemId !== initial.catalogItemId) {
    changes.catalogItemId = Number(values.catalogItemId);
  }
  if (values.measurementUnitId !== initial.measurementUnitId) {
    changes.measurementUnitId = Number(values.measurementUnitId);
  }
  if (values.requestType !== initial.requestType) changes.requestType = values.requestType;
  if (Number(values.quantity) !== Number(initial.quantity)) {
    changes.quantity = Number(values.quantity);
  }
  if (values.description.trim() !== initial.description.trim()) {
    changes.description = values.description.trim();
  }
  if (values.notes.trim() !== initial.notes.trim()) changes.notes = values.notes.trim();
  if (values.expirationDate !== initial.expirationDate) {
    changes.expirationDate = values.expirationDate;
  }
  if (values.publishedAt !== initial.publishedAt) changes.publishedAt = values.publishedAt;
  return changes;
}

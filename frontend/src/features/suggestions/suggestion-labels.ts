export const SUGGESTION_TYPES = [
  'CATEGORY',
  'FOOD_CATALOG_ITEM',
  'MEASUREMENT_UNIT',
  'CANCELLATION_REASON',
] as const;
export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

export const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  CATEGORY: 'Categoria',
  FOOD_CATALOG_ITEM: 'Item do catálogo',
  MEASUREMENT_UNIT: 'Unidade de medida',
  CANCELLATION_REASON: 'Motivo de cancelamento',
};

export const SUGGESTION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Recusada',
};

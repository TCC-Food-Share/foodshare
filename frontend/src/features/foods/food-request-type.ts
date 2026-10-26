export const FOOD_REQUEST_TYPES = ['TOTAL_ONLY', 'PARTIAL_ONLY', 'TOTAL_OR_PARTIAL'] as const;

export type FoodRequestType = (typeof FOOD_REQUEST_TYPES)[number];

export const FOOD_REQUEST_TYPE_LABELS: Record<FoodRequestType, string> = {
  TOTAL_ONLY: 'Somente total',
  PARTIAL_ONLY: 'Somente parcial',
  TOTAL_OR_PARTIAL: 'Total ou parcial',
};

export const FOOD_REQUEST_TYPE_DESCRIPTIONS: Record<FoodRequestType, string> = {
  TOTAL_ONLY: 'A entidade beneficiária deve solicitar toda a quantidade disponível',
  PARTIAL_ONLY: 'A entidade beneficiária informa a quantidade que deseja',
  TOTAL_OR_PARTIAL: 'A entidade beneficiária escolhe se quer tudo ou apenas uma parte',
};

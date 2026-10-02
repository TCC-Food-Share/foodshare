export const FOOD_STATUS = {
  ACTIVE: 'Ativo',
  RESERVED: 'Reservado',
  INACTIVE: 'Inativo',
} as const;

export const FOOD_STATUS_NAMES = Object.values(FOOD_STATUS);

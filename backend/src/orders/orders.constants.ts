export const INITIAL_STATUS = 'Pendente';
export const ACCEPTED_STATUS = 'Aceito';
export const REJECTED_STATUS = 'Rejeitado';
export const RECEIVED_STATUS = 'Recebido';

// Every seeded order status name (see prisma/seed.ts). Used to validate the
// `status` list filter and, as IN_PROGRESS_STATUSES, the RF15 in-progress count.
export const ORDER_STATUS_NAMES = [
  INITIAL_STATUS,
  ACCEPTED_STATUS,
  REJECTED_STATUS,
  RECEIVED_STATUS,
] as const;

export const IN_PROGRESS_STATUSES = [INITIAL_STATUS, ACCEPTED_STATUS];

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

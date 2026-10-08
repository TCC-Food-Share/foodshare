export const ROLE = {
  ESTABLISHMENT: 'Establishment',
  BENEFICIARY_ENTITY: 'BeneficiaryEntity',
  ADMINISTRATOR: 'Administrator',
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_NAMES = Object.values(ROLE);

export const INSTITUTION_ROLES: RoleName[] = [ROLE.ESTABLISHMENT, ROLE.BENEFICIARY_ENTITY];

export const ROLE_NOT_ALLOWED = 'ROLE_NOT_ALLOWED';

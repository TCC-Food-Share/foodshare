// Mirrored from the backend's class-validator regexes (create-*.dto.ts / address.dto.ts) — keep in sync.
export const PHONE_REGEX = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;
export const POSTAL_CODE_REGEX = /^\d{5}-?\d{3}$/;
export const UF_REGEX = /^[A-Z]{2}$/;

export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

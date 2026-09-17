import type { Modify } from '@react-input/mask';

export const CNPJ_MASK = '__.___.___/____-__';
export const CEP_MASK = '_____-___';
export const PHONE_MASK = '(__) ____-____';

export const phoneModify: Modify = (data) => {
  const digitsSoFar = data.value.replace(/\D/g, '').length;
  const digits =
    data.inputType === 'insert'
      ? digitsSoFar + data.data.replace(/\D/g, '').length
      : Math.max(0, digitsSoFar - 1);
  return { mask: digits > 10 ? '(__) _____-____' : '(__) ____-____' };
};

// `modify` only adjusts the mask as the user types — it never runs against a
// value the input already had at mount. A pre-filled phone (from the backend,
// 10 or 11 digits) needs the matching mask picked up front, or `useMask` throws
// ("initialized value ... longer than ... mask") on mount.
export function phoneMaskFor(value: string): string {
  return value.replace(/\D/g, '').length > 10 ? '(__) _____-____' : PHONE_MASK;
}

import type { Modify } from '@react-input/mask';

export const CNPJ_MASK = '__.___.___/____-__';
export const CEP_MASK = '_____-___';
export const PHONE_MASK = '(__) ____-____';

/**
 * Telefone BR: `(00) 0000-0000` (fixo, 10 dígitos) ou `(00) 00000-0000`
 * (celular, 11). Alterna a máscara conforme a quantidade de dígitos.
 */
export const phoneModify: Modify = (data) => {
  const digitsSoFar = data.value.replace(/\D/g, '').length;
  const digits =
    data.inputType === 'insert'
      ? digitsSoFar + data.data.replace(/\D/g, '').length
      : Math.max(0, digitsSoFar - 1);
  return { mask: digits > 10 ? '(__) _____-____' : '(__) ____-____' };
};

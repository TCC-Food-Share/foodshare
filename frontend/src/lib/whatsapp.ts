const BRAZIL_COUNTRY_CODE = '55';
const MOBILE_DIGITS = 11;

/**
 * Link `wa.me` com o número em formato internacional (RF09), ou `null` quando o número não
 * é de celular. O cadastro aceita também telefone fixo (10 dígitos), que não tem WhatsApp.
 */
export function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== MOBILE_DIGITS) return null;
  return `https://wa.me/${BRAZIL_COUNTRY_CODE}${digits}`;
}

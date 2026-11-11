/** Apara o texto; vazio depois de aparado vira `undefined` (parâmetro ausente). */
export const trimToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export function formatQuantity(quantity: string): string {
  return Number(quantity).toString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

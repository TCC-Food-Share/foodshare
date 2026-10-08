export function formatQuantity(quantity: string): string {
  return Number(quantity).toString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatLocalDateTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date.toLocaleDateString('pt-BR')} às ${time}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

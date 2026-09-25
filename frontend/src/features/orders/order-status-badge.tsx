import { Badge } from '@/components/ui/badge';
import type { OrderStatusName } from '@/features/orders/orders-api';
import { cn } from '@/lib/cn';

const STATUS_STYLES: Record<OrderStatusName, { badge: string; dot: string }> = {
  Pendente: {
    badge: 'border-warning/30 bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  Aceito: {
    badge: 'border-primary/20 bg-primary/10 text-primary dark:text-blue-400',
    dot: 'bg-primary dark:bg-blue-400',
  },
  Rejeitado: {
    badge: 'border-destructive/25 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  Recebido: {
    badge: 'border-green-600/25 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    dot: 'bg-green-600 dark:bg-green-400',
  },
};

interface OrderStatusBadgeProps {
  status: OrderStatusName;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const styles = STATUS_STYLES[status];

  return (
    <Badge variant="outline" className={cn('gap-1.5 rounded-full', styles.badge, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', styles.dot)} />
      {status}
    </Badge>
  );
}

import { Badge } from '@/components/ui/badge';
import { ORDER_STATUS_STYLES, type OrderStatusName } from '@/features/orders/order-status';
import { cn } from '@/lib/cn';

interface OrderStatusBadgeProps {
  status: OrderStatusName;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const styles = ORDER_STATUS_STYLES[status];

  return (
    <Badge variant="outline" className={cn('gap-1.5 rounded-full', styles.badge, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', styles.dot)} />
      {status}
    </Badge>
  );
}

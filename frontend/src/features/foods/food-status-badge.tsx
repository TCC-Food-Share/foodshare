import { Badge } from '@/components/ui/badge';
import { FOOD_STATUS_STYLES, isFoodStatus } from '@/features/foods/food-status';
import { cn } from '@/lib/cn';

interface FoodStatusBadgeProps {
  status: string;
  className?: string;
}

export function FoodStatusBadge({ status, className }: FoodStatusBadgeProps) {
  const styles = isFoodStatus(status) ? FOOD_STATUS_STYLES[status] : null;

  return (
    <Badge variant="outline" className={cn('gap-1.5 rounded-full', styles?.badge, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', styles?.dot)} />
      {status}
    </Badge>
  );
}

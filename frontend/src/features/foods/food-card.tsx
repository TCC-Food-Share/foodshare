import { CalendarIcon, ImageOffIcon, PackageIcon, StoreIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import type { FoodListItem } from '@/features/foods/foods-api';
import { formatDate, formatQuantity } from '@/lib/format';

export function FoodCard({ food }: { food: FoodListItem }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to={`/alimentos/${food.id}`}
      className="border-border bg-card focus-visible:ring-ring/50 flex flex-col overflow-hidden rounded-lg border shadow-xs outline-none focus-visible:ring-[3px]"
    >
      <div className="bg-muted flex h-40 w-full items-center justify-center overflow-hidden">
        {food.image && !imageFailed ? (
          <img
            src={food.image}
            alt={food.name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOffIcon className="text-muted-foreground size-8" />
        )}
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <h3 className="text-card-foreground text-[15px] font-semibold">{food.name}</h3>

        <Badge variant="secondary" className="w-fit rounded-full">
          {food.category.name}
        </Badge>

        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <StoreIcon className="size-3.5" />
          <span>{food.establishment.companyName}</span>
        </div>

        <div className="text-muted-foreground flex flex-col gap-1.5 text-[13px]">
          <div className="flex items-center gap-1.5">
            <PackageIcon className="size-3.5" />
            <span>
              Qtd: {formatQuantity(food.quantity)} {food.quantityUnit}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5" />
            <span>Validade: {formatDate(food.expirationDate)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

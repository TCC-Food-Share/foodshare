import { CalendarIcon, ImageOffIcon, PackageIcon, StoreIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/use-auth';
import { establishmentDisplayName, type FoodListItem } from '@/features/foods/foods-api';
import { institutionProfilePath } from '@/features/institutions/institution-kind';
import { formatDate, formatQuantity } from '@/lib/format';

interface FoodCardProps {
  food: FoodListItem;
  showEstablishment?: boolean;
}

export function FoodCard({ food, showEstablishment = true }: FoodCardProps) {
  const { role } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const establishmentName = establishmentDisplayName(food.establishment);

  return (
    <article className="border-border bg-card has-[h3_a:focus-visible]:ring-ring/50 relative flex flex-col overflow-hidden rounded-lg border shadow-xs has-[h3_a:focus-visible]:ring-[3px]">
      <div className="bg-muted flex h-40 w-full items-center justify-center overflow-hidden">
        {food.image && !imageFailed ? (
          <img
            src={food.image}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOffIcon className="text-muted-foreground size-8" />
        )}
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <h3 className="text-card-foreground text-[15px] font-semibold">
          {/* The ::after stretches this link over the whole card, so the card stays clickable
              while the establishment link below sits on top of it. */}
          <Link
            to={`/alimentos/${food.id}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {food.name}
          </Link>
        </h3>

        <Badge variant="secondary" className="w-fit rounded-full">
          {food.category.name}
        </Badge>

        {showEstablishment && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <StoreIcon className="size-3.5 shrink-0" />
            {role === 'beneficiary' ? (
              <Link
                to={institutionProfilePath('establishment', food.establishment.id)}
                className="hover:text-foreground focus-visible:text-foreground relative z-10 underline-offset-2 outline-none hover:underline focus-visible:underline"
              >
                {establishmentName}
              </Link>
            ) : (
              <span>{establishmentName}</span>
            )}
          </div>
        )}

        <div className="text-muted-foreground flex flex-col gap-1.5 text-[13px]">
          <div className="flex items-center gap-1.5">
            <PackageIcon className="size-3.5" />
            <span>
              Qtd: {formatQuantity(food.quantity)} {food.measurementUnit.abbreviation}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5" />
            <span>Validade: {formatDate(food.expirationDate)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

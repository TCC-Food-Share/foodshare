import { AppleIcon } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import type { AdminFoodRow } from '@/features/admin/foods/admin-foods-api';
import { cn } from '@/lib/cn';

export function FoodThumbnail({
  image,
  name,
  className,
}: {
  image: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        'bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md',
        className,
      )}
    >
      {image && !failed ? (
        <img
          src={image}
          alt={name}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <AppleIcon aria-hidden className="text-muted-foreground size-1/2" />
      )}
    </div>
  );
}

/** RF53: an establishment soft deleted stands out wherever the food shows. */
export function EstablishmentName({ establishment }: Pick<AdminFoodRow, 'establishment'>) {
  if (!establishment.deleted) return <span>{establishment.publicName}</span>;
  return (
    <span className="text-destructive flex flex-col">
      <span className="font-medium">{establishment.publicName}</span>
      <span className="text-xs">Estabelecimento excluído</span>
    </span>
  );
}

export function FoodDeletedBadge() {
  return <Badge variant="destructive">Excluído</Badge>;
}

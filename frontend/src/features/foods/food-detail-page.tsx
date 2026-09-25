import { useQuery } from '@tanstack/react-query';
import { CalendarIcon, Clock3Icon, ImageOffIcon, PackageIcon, StoreIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import { getFood } from '@/features/foods/foods-api';
import { RequestDonationCard } from '@/features/orders/request-donation-card';
import { ApiError } from '@/lib/api';
import { formatDate, formatQuantity } from '@/lib/format';

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackageIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-5">
      <Icon className="text-primary size-5" />
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-base font-semibold">{value}</span>
    </div>
  );
}

export function FoodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const foodId = Number(id);
  const [imageFailed, setImageFailed] = useState(false);

  const query = useQuery({
    queryKey: ['food', foodId],
    queryFn: () => getFood(foodId),
    enabled: Number.isInteger(foodId),
  });

  if (!Number.isInteger(foodId)) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-foreground font-medium">Alimento não encontrado.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/feed">Voltar para o feed</Link>
        </Button>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;

    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-foreground font-medium">
          {notFound
            ? 'Alimento não encontrado.'
            : 'Não foi possível carregar o alimento. Tente novamente mais tarde.'}
        </p>
        {notFound ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/feed">Voltar para o feed</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  const food = query.data!;

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-muted flex h-80 w-full items-center justify-center overflow-hidden rounded-lg">
        {food.image && !imageFailed ? (
          <img
            src={food.image}
            alt={food.name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOffIcon className="text-muted-foreground size-12" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-foreground text-2xl font-bold">{food.name}</h1>
            <Badge className="gap-1.5 rounded-full border-transparent bg-green-100 text-green-700 hover:bg-green-100">
              <span className="size-2 rounded-full bg-green-600" />
              {food.status.name}
            </Badge>
          </div>

          <Badge variant="secondary" className="w-fit rounded-full">
            {food.category.name}
          </Badge>

          <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-6">
            <h2 className="text-foreground text-lg font-semibold">Descrição</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{food.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoItem
              icon={PackageIcon}
              label="Quantidade"
              value={`${formatQuantity(food.quantity)} ${food.quantityUnit}`}
            />
            <InfoItem
              icon={CalendarIcon}
              label="Validade"
              value={formatDate(food.expirationDate)}
            />
            <InfoItem icon={Clock3Icon} label="Publicado em" value={formatDate(food.publishedAt)} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6">
            <h2 className="text-foreground text-lg font-semibold">Estabelecimento</h2>
            <div className="flex items-center gap-3.5">
              <div className="bg-primary flex size-12 shrink-0 items-center justify-center rounded-full">
                <StoreIcon className="text-primary-foreground size-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm font-semibold">
                  {food.establishment.companyName}
                </span>
                {food.establishment.city && food.establishment.state && (
                  <span className="text-muted-foreground text-xs">
                    {food.establishment.city}, {food.establishment.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          {role === 'beneficiary' && <RequestDonationCard food={food} />}
        </div>
      </div>
    </div>
  );
}

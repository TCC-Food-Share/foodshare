import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, CircleAlertIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EstablishmentName,
  FoodDeletedBadge,
  FoodThumbnail,
} from '@/features/admin/foods/admin-food-display';
import { formatFoodQuantity, ORDER_COUNT_LABELS } from '@/features/admin/foods/admin-food-format';
import {
  ADMIN_FOODS_PATH,
  ADMIN_FOODS_QUERY_KEY,
  type AdminFoodOrderCounts,
  adminFoodPath,
  adminFoodsApi,
  isEditable,
  NOT_EDITABLE_MESSAGE,
} from '@/features/admin/foods/admin-foods-api';
import {
  DeleteFoodPermanentlyDialog,
  type FoodDeletionTarget,
} from '@/features/admin/foods/delete-food-permanently-dialog';
import { FOOD_REQUEST_TYPE_LABELS } from '@/features/foods/food-request-type';
import { FoodStatusBadge } from '@/features/foods/food-status-badge';
import { ApiError } from '@/lib/api';
import { formatDate, formatLocalDate } from '@/lib/format';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-line">{value || '—'}</dd>
    </div>
  );
}

const ORDER_INDICATOR_LABELS: Record<keyof AdminFoodOrderCounts, string> = {
  pending: 'Pendentes',
  inProgress: 'Em andamento',
  rejected: 'Rejeitados',
  donated: 'Doados',
  cancelled: 'Cancelados',
};

export function NotFoundFood() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-start gap-4">
      <Alert>
        <CircleAlertIcon />
        <AlertDescription>
          Alimento não encontrado. Ele pode ter sido excluído permanentemente.
        </AlertDescription>
      </Alert>
      <Button asChild variant="outline">
        <Link to={ADMIN_FOODS_PATH}>
          <ArrowLeftIcon />
          Voltar para alimentos
        </Link>
      </Button>
    </div>
  );
}

/** RF53: any food, whatever its status or the establishment's. */
export function AdminFoodDetailPage() {
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const [deletionTarget, setDeletionTarget] = useState<FoodDeletionTarget | null>(null);

  const query = useQuery({
    queryKey: [...ADMIN_FOODS_QUERY_KEY, 'detail', id],
    queryFn: () => adminFoodsApi.get(id),
    enabled: valid,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });

  if (!valid) return <Navigate to={ADMIN_FOODS_PATH} replace />;

  if (query.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.error instanceof ApiError && query.error.status === 404) return <NotFoundFood />;

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>Não foi possível carregar o alimento.</AlertDescription>
      </Alert>
    );
  }

  const food = query.data;
  const editable = isEditable(food);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to={ADMIN_FOODS_PATH}>
          <ArrowLeftIcon />
          Alimentos
        </Link>
      </Button>

      {food.establishment.deleted && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            O estabelecimento "{food.establishment.publicName}" foi excluído. Este alimento não
            aparece mais para as entidades.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <FoodThumbnail image={food.image} name={food.name} className="size-20 sm:size-24" />
          <div className="flex flex-1 flex-col gap-1">
            <h1 className="text-xl font-semibold">{food.name}</h1>
            <span className="text-muted-foreground text-sm">{food.category.name}</span>
            <span className="flex flex-wrap items-center gap-2">
              <FoodStatusBadge status={food.status} />
              {food.deleted && <FoodDeletedBadge />}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-center">
            {editable && (
              <Button asChild>
                <Link to={`${adminFoodPath(food.id)}/editar`}>
                  <PencilIcon />
                  Editar
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                setDeletionTarget({
                  id: food.id,
                  name: food.name,
                  establishment: food.establishment.publicName,
                })
              }
            >
              <Trash2Icon />
              Excluir permanentemente
            </Button>
          </div>
        </CardContent>
      </Card>

      {!editable && <p className="text-muted-foreground text-sm">{NOT_EDITABLE_MESSAGE}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados do alimento</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <Field label="Quantidade" value={formatFoodQuantity(food)} />
              <Field label="Unidade de medida" value={food.measurementUnit.name} />
              <Field
                label="Tipo de solicitação"
                value={FOOD_REQUEST_TYPE_LABELS[food.requestType]}
              />
              <Field label="Descrição" value={food.description} />
              <Field label="Observações" value={food.notes} />
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Estabelecimento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3">
                <Field
                  label="Nome"
                  value={<EstablishmentName establishment={food.establishment} />}
                />
                <Field label="Razão social" value={food.establishment.companyName} />
                <Field
                  label="Exclusão lógica"
                  value={food.establishment.deleted ? 'Excluído' : 'Ativo'}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datas e situação</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3">
                <Field label="Data de vencimento" value={formatDate(food.expirationDate)} />
                <Field label="Data de publicação" value={formatLocalDate(food.publishedAt)} />
                <Field label="Exclusão lógica" value={food.deleted ? 'Excluído' : 'Não excluído'} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos do alimento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(ORDER_COUNT_LABELS) as (keyof AdminFoodOrderCounts)[]).map((key) => (
            <div key={key} className="bg-muted/50 flex flex-col gap-1 rounded-md border p-3">
              <span className="text-2xl font-semibold tabular-nums">{food.orders[key]}</span>
              <span className="text-muted-foreground text-xs">{ORDER_INDICATOR_LABELS[key]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <DeleteFoodPermanentlyDialog
        target={deletionTarget}
        onClose={() => setDeletionTarget(null)}
        onDeleted={() => void navigate(ADMIN_FOODS_PATH, { replace: true })}
      />
    </div>
  );
}

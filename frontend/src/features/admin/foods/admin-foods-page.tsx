import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EyeIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminTable } from '@/components/admin-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EstablishmentName,
  FoodDeletedBadge,
  FoodThumbnail,
} from '@/features/admin/foods/admin-food-display';
import { formatFoodQuantity } from '@/features/admin/foods/admin-food-format';
import {
  ADMIN_FOODS_QUERY_KEY,
  adminFoodPath,
  type AdminFoodRow,
  adminFoodsApi,
  isEditable,
} from '@/features/admin/foods/admin-foods-api';
import {
  DeleteFoodPermanentlyDialog,
  type FoodDeletionTarget,
} from '@/features/admin/foods/delete-food-permanently-dialog';
import { useAdminListParams } from '@/features/admin/lists/use-admin-list-params';
import { FOOD_REQUEST_TYPE_LABELS } from '@/features/foods/food-request-type';
import { FOOD_STATUSES } from '@/features/foods/food-status';
import { FoodStatusBadge } from '@/features/foods/food-status-badge';
import { formatDate, formatLocalDate } from '@/lib/format';

const FILTER_KEYS = ['status', 'situation'] as const;
const ALL = 'ALL';

const SITUATION_LABELS = { active: 'Não excluídos', deleted: 'Excluídos' } as const;

const ACTION_CLASS = 'text-muted-foreground hover:text-foreground size-8';

/** RF52, DT60: every food of the platform, in any status, soft deleted or not. */
export function AdminFoodsPage() {
  const [params, setParams] = useAdminListParams(FILTER_KEYS);
  const [deletionTarget, setDeletionTarget] = useState<FoodDeletionTarget | null>(null);

  const status = String(params.status ?? ALL);
  const situation = String(params.situation ?? ALL);

  const query = useQuery({
    queryKey: [...ADMIN_FOODS_QUERY_KEY, 'list', params],
    queryFn: () => adminFoodsApi.list(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Alimentos</h1>
        <p className="text-muted-foreground text-sm">
          Alimentos de todos os estabelecimentos, em qualquer status
        </p>
      </div>

      <AdminTable<AdminFoodRow>
        columns={[
          {
            key: 'image',
            header: 'Imagem',
            className: 'w-20',
            render: (row) => <FoodThumbnail image={row.image} name={row.name} />,
          },
          {
            key: 'name',
            header: 'Nome',
            sortable: true,
            className: 'max-w-48 whitespace-normal break-words',
            render: (row) => row.name,
          },
          {
            key: 'category',
            header: 'Categoria',
            sortable: true,
            className: 'max-w-40 whitespace-normal break-words',
            render: (row) => row.category.name,
          },
          {
            key: 'quantity',
            header: 'Quantidade',
            sortable: true,
            className: 'whitespace-nowrap',
            render: formatFoodQuantity,
          },
          {
            key: 'requestType',
            header: 'Tipo',
            className: 'whitespace-nowrap',
            render: (row) => FOOD_REQUEST_TYPE_LABELS[row.requestType],
          },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (row) => <FoodStatusBadge status={row.status} />,
          },
          {
            key: 'establishment',
            header: 'Estabelecimento',
            sortable: true,
            className: 'max-w-48 whitespace-normal break-words',
            render: (row) => <EstablishmentName establishment={row.establishment} />,
          },
          {
            key: 'expirationDate',
            header: 'Vencimento',
            sortable: true,
            render: (row) => formatDate(row.expirationDate),
          },
          {
            key: 'publishedAt',
            header: 'Publicação',
            sortable: true,
            render: (row) => formatLocalDate(row.publishedAt),
          },
          {
            key: 'deleted',
            header: 'Situação',
            render: (row) =>
              row.deleted ? (
                <FoodDeletedBadge />
              ) : (
                <span className="text-muted-foreground">Não excluído</span>
              ),
          },
        ]}
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder="Buscar por nome, categoria, estabelecimento ou data..."
        itemLabel="alimentos"
        toolbar={
          <>
            <Select
              value={status}
              onValueChange={(value) =>
                setParams({ ...params, status: value === ALL ? undefined : value, page: 1 })
              }
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os status</SelectItem>
                {FOOD_STATUSES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={situation}
              onValueChange={(value) =>
                setParams({ ...params, situation: value === ALL ? undefined : value, page: 1 })
              }
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as situações</SelectItem>
                <SelectItem value="active">{SITUATION_LABELS.active}</SelectItem>
                <SelectItem value="deleted">{SITUATION_LABELS.deleted}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        rowActions={(row) => (
          <>
            <Button asChild variant="ghost" size="icon" className={ACTION_CLASS}>
              <Link to={adminFoodPath(row.id)} aria-label={`Ver ${row.name}`} title="Ver">
                <EyeIcon />
              </Link>
            </Button>
            {isEditable(row) && (
              <Button asChild variant="ghost" size="icon" className={ACTION_CLASS}>
                <Link
                  to={`${adminFoodPath(row.id)}/editar`}
                  aria-label={`Editar ${row.name}`}
                  title="Editar"
                >
                  <PencilIcon />
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-8"
              aria-label={`Excluir permanentemente ${row.name}`}
              title="Excluir permanentemente"
              onClick={() =>
                setDeletionTarget({
                  id: row.id,
                  name: row.name,
                  establishment: row.establishment.publicName,
                })
              }
            >
              <Trash2Icon />
            </Button>
          </>
        )}
      />

      <DeleteFoodPermanentlyDialog
        target={deletionTarget}
        onClose={() => setDeletionTarget(null)}
      />
    </div>
  );
}

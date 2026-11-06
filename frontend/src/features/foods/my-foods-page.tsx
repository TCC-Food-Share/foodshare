import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  EllipsisVerticalIcon,
  EyeIcon,
  ImageOffIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AdminTable, type AdminTableColumn } from '@/components/admin-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminListParams } from '@/features/admin/lists/list-api';
import { CreateFoodDialog } from '@/features/foods/create-food-dialog';
import { FoodDeactivateDialog } from '@/features/foods/food-deactivate-dialog';
import { FoodDeleteDialog } from '@/features/foods/food-delete-dialog';
import {
  FOOD_STATUS,
  FOOD_STATUSES,
  type FoodStatusName,
  isFoodStatus,
} from '@/features/foods/food-status';
import { FoodStatusBadge } from '@/features/foods/food-status-badge';
import { FoodStockDialog } from '@/features/foods/food-stock-dialog';
import { todayUtcIso } from '@/features/foods/food-stock-schema';
import { listMyFoods, MY_FOODS_REFETCH_INTERVAL, type MyFood } from '@/features/foods/my-foods-api';
import { useMyFoodCounts } from '@/features/foods/use-my-food-counts';
import { cn } from '@/lib/cn';
import { formatDate, formatQuantity } from '@/lib/format';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

type FoodAction = 'edit' | 'deactivate' | 'reactivate' | 'delete';

const DEFAULT_PARAMS: AdminListParams = {
  sort: 'publishedAt',
  order: 'desc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

function FoodThumbnail({ food }: { food: MyFood }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
      {food.image && !failed ? (
        <img
          src={food.image}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOffIcon className="text-muted-foreground size-4" />
      )}
    </span>
  );
}

function ExpirationCell({ food }: { food: MyFood }) {
  const expired = food.expirationDate.slice(0, 10) < todayUtcIso();

  return (
    <span className={cn('flex flex-col', expired && 'text-destructive')}>
      {formatDate(food.expirationDate)}
      {expired && <span className="text-xs font-normal">Vencido</span>}
    </span>
  );
}

const COLUMNS: AdminTableColumn<MyFood>[] = [
  {
    key: 'name',
    header: 'Alimento',
    sortable: true,
    render: (food) => (
      <span className="flex items-center gap-3">
        <FoodThumbnail food={food} />
        {food.name}
      </span>
    ),
  },
  { key: 'category', header: 'Categoria', sortable: true, render: (food) => food.category.name },
  {
    key: 'quantity',
    header: 'Quantidade',
    sortable: true,
    render: (food) => `${formatQuantity(food.quantity)} ${food.measurementUnit.abbreviation}`,
  },
  {
    key: 'status',
    header: 'Status',
    render: (food) => <FoodStatusBadge status={food.status.name} />,
  },
  {
    key: 'expirationDate',
    header: 'Validade',
    sortable: true,
    render: (food) => <ExpirationCell food={food} />,
  },
  {
    key: 'publishedAt',
    header: 'Publicação',
    sortable: true,
    render: (food) => formatDate(food.publishedAt),
  },
  {
    key: 'orders',
    header: 'Solicitações',
    render: (food) => (
      <span title={`${food.pendingOrders} pendentes, ${food.inProgressOrders} em andamento`}>
        {food.pendingOrders + food.inProgressOrders}
      </span>
    ),
  },
];

function RowActions({
  food,
  onAction,
}: {
  food: MyFood;
  onAction: (action: FoodAction, food: MyFood) => void;
}) {
  const isActive = food.status.name === FOOD_STATUS.ACTIVE;
  const isInactive = food.status.name === FOOD_STATUS.INACTIVE;
  const blocked = food.inProgressOrders > 0;

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground size-8"
      >
        <Link to={`/alimentos/${food.id}`} aria-label={`Ver ${food.name}`}>
          <EyeIcon />
        </Link>
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8"
            aria-label={`Mais ações de ${food.name}`}
          >
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {isActive && (
            <>
              <DropdownMenuItem disabled={blocked} onSelect={() => onAction('edit', food)}>
                <PencilIcon />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={blocked} onSelect={() => onAction('deactivate', food)}>
                <PowerOffIcon />
                Desativar
              </DropdownMenuItem>
              {blocked && (
                <p className="text-muted-foreground px-2 py-1 text-xs">
                  Indisponível enquanto houver pedido em andamento.
                </p>
              )}
            </>
          )}
          {isInactive && (
            <DropdownMenuItem onSelect={() => onAction('reactivate', food)}>
              <PowerIcon />
              Reativar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => onAction('delete', food)}>
            <Trash2Icon />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function MyFoodsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [params, setParams] = useState<AdminListParams>(DEFAULT_PARAMS);
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<{ action: FoodAction; food: MyFood } | null>(null);
  const counts = useMyFoodCounts();

  const statusParam = searchParams.get('status');
  const status: FoodStatusName = isFoodStatus(statusParam) ? statusParam : FOOD_STATUS.ACTIVE;

  const query = useQuery({
    queryKey: ['foods', 'mine', 'list', status, params],
    queryFn: () => listMyFoods({ ...params, status }),
    placeholderData: keepPreviousData,
    refetchInterval: MY_FOODS_REFETCH_INTERVAL,
  });

  const result = query.data;
  if (result && result.data.length === 0 && result.total > 0 && result.page === params.page) {
    const lastPage = Math.ceil(result.total / result.pageSize);
    if (lastPage !== params.page) setParams({ ...params, page: lastPage });
  }

  function changeStatus(next: string) {
    if (!isFoodStatus(next)) return;
    setSearchParams({ status: next });
    setParams((current) => ({ ...current, page: 1 }));
  }

  const close = () => setActive(null);
  const foodFor = (...actions: FoodAction[]) =>
    active && actions.includes(active.action) ? active.food : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Meus alimentos</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os alimentos que você cadastrou para doação
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start">
          <PlusIcon />
          Cadastrar alimento
        </Button>
      </div>

      <Tabs value={status} onValueChange={changeStatus} className="gap-4">
        <TabsList variant="line" aria-label="Alimentos por status">
          {FOOD_STATUSES.map((tabStatus) => (
            <TabsTrigger key={tabStatus} value={tabStatus}>
              {tabStatus}
              {counts[tabStatus] !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    tabStatus === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {counts[tabStatus]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <AdminTable
        columns={COLUMNS}
        result={result}
        isLoading={query.isLoading}
        isError={query.isError}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder="Buscar por nome, categoria, quantidade, descrição ou data..."
        itemLabel="alimentos"
        rowActions={(food) => (
          <RowActions food={food} onAction={(action, row) => setActive({ action, food: row })} />
        )}
      />

      <CreateFoodDialog open={createOpen} onOpenChange={setCreateOpen} />
      <FoodStockDialog
        food={foodFor('edit', 'reactivate')}
        mode={active?.action === 'reactivate' ? 'reactivate' : 'edit'}
        onClose={close}
      />
      <FoodDeactivateDialog food={foodFor('deactivate')} onClose={close} />
      <FoodDeleteDialog food={foodFor('delete')} onClose={close} />
    </div>
  );
}

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, CircleAlertIcon, PencilIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { PageSizeSelect } from '@/components/page-size-select';
import { PaginationBar } from '@/components/pagination-bar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserAvatar } from '@/components/user-avatar';
import { InstitutionSituationBadges } from '@/features/admin/institutions/admin-institutions-page';
import {
  type AdminInstitutionKind,
  INSTITUTION_KIND_LABELS,
  institutionPath,
  INSTITUTIONS_PATH,
  slugToKind,
} from '@/features/admin/institutions/institution-kind';
import {
  type AdminInstitutionProfile,
  INSTITUTIONS_QUERY_KEY,
  institutionsApi,
  type PageParams,
} from '@/features/admin/institutions/institutions-api';
import { FOOD_STATUS } from '@/features/foods/food-status';
import { FoodStatusBadge } from '@/features/foods/food-status-badge';
import { isOrderStatus, ORDER_STATUS } from '@/features/orders/order-status';
import { OrderStatusBadge } from '@/features/orders/order-status-badge';
import { formatDate, formatLocalDate, formatLocalDateTime } from '@/lib/format';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{value || '—'}</dd>
    </div>
  );
}

function Indicator({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 flex flex-col gap-1 rounded-md border p-3">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function usePagedQuery<T>(key: readonly unknown[], fetch: (params: PageParams) => Promise<T>) {
  const [params, setParams] = useState<PageParams>({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  const query = useQuery({
    queryKey: [...key, params],
    queryFn: () => fetch(params),
    placeholderData: keepPreviousData,
  });
  return { params, setParams, query };
}

function PagedTable({
  title,
  headers,
  total,
  params,
  onChange,
  isLoading,
  isError,
  children,
}: {
  title: string;
  headers: string[];
  total: number;
  params: PageParams;
  onChange: (params: PageParams) => void;
  isLoading: boolean;
  isError: boolean;
  children: ReactNode;
}) {
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={headers.length}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={headers.length}
                    className="text-muted-foreground py-6 text-center"
                  >
                    Não foi possível carregar a lista.
                  </TableCell>
                </TableRow>
              ) : total === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={headers.length}
                    className="text-muted-foreground py-6 text-center"
                  >
                    Nenhum registro.
                  </TableCell>
                </TableRow>
              ) : (
                children
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <PageSizeSelect
            value={params.pageSize}
            onChange={(pageSize) => onChange({ page: 1, pageSize })}
          />
          <PaginationBar
            page={params.page}
            totalPages={totalPages}
            onPageChange={(page) => onChange({ ...params, page })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DeletedMark({ deleted }: { deleted: boolean }) {
  return deleted ? (
    <Badge variant="destructive" className="ml-2">
      Excluído
    </Badge>
  ) : null;
}

function FoodsTable({ id }: { id: number }) {
  const { params, setParams, query } = usePagedQuery(
    [...INSTITUTIONS_QUERY_KEY, 'foods', id],
    (p) => institutionsApi.foods(id, p),
  );
  return (
    <PagedTable
      title="Alimentos"
      headers={['Alimento', 'Quantidade', 'Validade', 'Status']}
      total={query.data?.total ?? 0}
      params={params}
      onChange={setParams}
      isLoading={query.isLoading}
      isError={query.isError}
    >
      {query.data?.data.map((food) => (
        <TableRow key={food.id}>
          <TableCell>
            {food.name}
            <DeletedMark deleted={food.deleted} />
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {food.quantity} {food.unit}
          </TableCell>
          <TableCell>{formatDate(food.expirationDate)}</TableCell>
          <TableCell>
            <FoodStatusBadge status={food.status} />
          </TableCell>
        </TableRow>
      ))}
    </PagedTable>
  );
}

function OrdersTable({ kind, id }: { kind: AdminInstitutionKind; id: number }) {
  const { params, setParams, query } = usePagedQuery(
    [...INSTITUTIONS_QUERY_KEY, 'orders', kind, id],
    (p) => institutionsApi.orders(kind, id, p),
  );
  const counterpart = kind === 'ESTABLISHMENT' ? 'Entidade' : 'Estabelecimento';
  return (
    <PagedTable
      title={kind === 'ESTABLISHMENT' ? 'Pedidos recebidos' : 'Pedidos feitos'}
      headers={['Pedido', 'Alimento', counterpart, 'Quantidade', 'Data', 'Status']}
      total={query.data?.total ?? 0}
      params={params}
      onChange={setParams}
      isLoading={query.isLoading}
      isError={query.isError}
    >
      {query.data?.data.map((order) => (
        <TableRow key={order.id}>
          <TableCell className="text-muted-foreground">
            #{order.id}
            <DeletedMark deleted={order.deleted} />
          </TableCell>
          <TableCell>{order.foodName}</TableCell>
          <TableCell>{order.counterpartName}</TableCell>
          <TableCell className="whitespace-nowrap">
            {order.quantity} {order.unit}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {formatLocalDateTime(order.orderDate)}
          </TableCell>
          <TableCell>
            {isOrderStatus(order.status) ? (
              <OrderStatusBadge status={order.status} />
            ) : (
              order.status
            )}
          </TableCell>
        </TableRow>
      ))}
    </PagedTable>
  );
}

function ActivityCard({ data }: { data: AdminInstitutionProfile }) {
  const { foods, orders } = data.activity;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores de atividade</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {foods && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Alimentos</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Indicator label={FOOD_STATUS.ACTIVE} value={foods.active} />
              <Indicator label={FOOD_STATUS.RESERVED} value={foods.reserved} />
              <Indicator label={FOOD_STATUS.INACTIVE} value={foods.inactive} />
              <Indicator label="Excluídos" value={foods.deleted} />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {data.kind === 'ESTABLISHMENT' ? 'Pedidos recebidos' : 'Pedidos feitos'}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Indicator label={ORDER_STATUS.PENDING} value={orders.pending} />
            <Indicator label={ORDER_STATUS.IN_PROGRESS} value={orders.inProgress} />
            <Indicator label={ORDER_STATUS.REJECTED} value={orders.rejected} />
            <Indicator label={ORDER_STATUS.DONATED} value={orders.donated} />
            <Indicator label={ORDER_STATUS.CANCELLED} value={orders.cancelled} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminInstitutionProfilePage() {
  const { slug, id: rawId } = useParams();
  const kind = slugToKind(slug);
  const id = Number(rawId);
  const valid = kind !== null && Number.isInteger(id) && id > 0;

  const query = useQuery({
    queryKey: [...INSTITUTIONS_QUERY_KEY, 'profile', kind, id],
    queryFn: () => institutionsApi.get(kind!, id),
    enabled: valid,
  });

  if (!valid) return <Navigate to={INSTITUTIONS_PATH} replace />;

  if (query.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>Não foi possível carregar a instituição.</AlertDescription>
      </Alert>
    );
  }

  const data = query.data;
  const name = data.tradeName?.trim() || data.companyName;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to={INSTITUTIONS_PATH}>
          <ArrowLeftIcon />
          Instituições
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar image={data.image} name={name} className="size-16 text-lg" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{name}</h1>
              <Badge variant="outline">{INSTITUTION_KIND_LABELS[data.kind]}</Badge>
            </div>
            <InstitutionSituationBadges deleted={data.deleted} emailVerified={data.emailVerified} />
          </div>
          <Button asChild className="self-start sm:self-center">
            <Link to={`${institutionPath(data.kind, data.id)}/editar`}>
              <PencilIcon />
              Editar
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados institucionais</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <Field label="Razão social" value={data.companyName} />
              <Field label="Nome fantasia" value={data.tradeName} />
              <Field label="CNPJ" value={data.cnpj} />
              <Field label="E-mail institucional" value={data.institutionalEmail} />
              <Field label="Celular institucional" value={data.institutionalPhone} />
              <Field label="Descrição" value={data.description} />
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Responsável pelo cadastro</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3">
                <Field label="Nome" value={data.responsible.name} />
                <Field label="E-mail pessoal" value={data.responsible.email} />
                <Field label="Celular pessoal" value={data.responsible.personalPhone} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Situação</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3">
                <Field label="Data de cadastro" value={formatLocalDate(data.createdAt)} />
                <Field label="Exclusão lógica" value={data.deleted ? 'Excluída' : 'Ativa'} />
                <Field
                  label="E-mail confirmado"
                  value={data.emailVerified ? 'Sim' : 'Não (aguardando confirmação)'}
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Field label="CEP" value={data.address.postalCode} />
            <Field label="Logradouro" value={data.address.street} />
            <Field label="Número" value={data.address.number} />
            <Field label="Complemento" value={data.address.complement} />
            <Field label="Cidade" value={data.address.city} />
            <Field label="UF" value={data.address.state} />
          </dl>
        </CardContent>
      </Card>

      <ActivityCard data={data} />

      {data.kind === 'ESTABLISHMENT' && <FoodsTable id={data.id} />}
      <OrdersTable kind={data.kind} id={data.id} />
    </div>
  );
}

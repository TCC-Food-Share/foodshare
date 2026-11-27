import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EyeIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/user-avatar';
import { DeleteInstitutionPermanentlyDialog } from '@/features/admin/institutions/delete-institution-permanently-dialog';
import {
  INSTITUTION_KIND_LABELS,
  INSTITUTION_KINDS,
  institutionPath,
  INSTITUTIONS_PATH,
  publicName,
} from '@/features/admin/institutions/institution-kind';
import {
  type AdminInstitutionRow,
  INSTITUTIONS_QUERY_KEY,
  institutionsApi,
} from '@/features/admin/institutions/institutions-api';
import {
  type InstitutionDeletionTarget,
  SoftDeleteInstitutionDialog,
} from '@/features/admin/institutions/soft-delete-institution-dialog';
import { useAdminListParams } from '@/features/admin/lists/use-admin-list-params';
import { formatLocalDate } from '@/lib/format';

const FILTER_KEYS = ['type', 'status'] as const;
const ALL = 'ALL';

const STATUS_LABELS = { active: 'Ativas', deleted: 'Excluídas' } as const;

export function InstitutionSituationBadges({
  deleted,
  emailVerified,
}: {
  deleted: boolean;
  emailVerified: boolean;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {deleted && <Badge variant="destructive">Excluída</Badge>}
      {!emailVerified && (
        <Badge
          variant="secondary"
          title="Ainda não confirmou o e-mail. Sem confirmação em 24 horas, o cadastro é apagado."
        >
          Aguardando confirmação
        </Badge>
      )}
      {!deleted && emailVerified && <span className="text-muted-foreground">Ativa</span>}
    </span>
  );
}

export function AdminInstitutionsPage() {
  const [params, setParams] = useAdminListParams(FILTER_KEYS);
  const [softDeleteTarget, setSoftDeleteTarget] = useState<InstitutionDeletionTarget | null>(null);
  const [permanentTarget, setPermanentTarget] = useState<InstitutionDeletionTarget | null>(null);

  const type = String(params.type ?? ALL);
  const status = String(params.status ?? ALL);

  const query = useQuery({
    queryKey: [...INSTITUTIONS_QUERY_KEY, 'list', params],
    queryFn: () => institutionsApi.list(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Instituições</h1>
          <p className="text-muted-foreground text-sm">
            Estabelecimentos e entidades beneficiárias cadastrados
          </p>
        </div>
        <Button asChild className="self-start">
          <Link to={`${INSTITUTIONS_PATH}/nova`}>
            <PlusIcon />
            Nova instituição
          </Link>
        </Button>
      </div>

      <AdminTable<AdminInstitutionRow>
        columns={[
          {
            key: 'type',
            header: 'Tipo',
            sortable: true,
            render: (row) => INSTITUTION_KIND_LABELS[row.kind],
          },
          {
            key: 'image',
            header: 'Imagem',
            className: 'w-20',
            render: (row) => (
              <UserAvatar image={row.image} name={publicName(row)} className="size-8 text-xs" />
            ),
          },
          {
            key: 'companyName',
            header: 'Nome',
            sortable: true,
            className: 'max-w-56 whitespace-normal break-words',
            render: (row) => (
              <span className="flex flex-col">
                {publicName(row)}
                {row.tradeName?.trim() && (
                  <span className="text-muted-foreground text-xs font-normal">
                    {row.companyName}
                  </span>
                )}
              </span>
            ),
          },
          {
            key: 'cnpj',
            header: 'CNPJ',
            sortable: true,
            className: 'whitespace-nowrap',
            render: (row) => row.cnpj,
          },
          {
            key: 'responsibleName',
            header: 'Responsável',
            sortable: true,
            className: 'max-w-56 whitespace-normal break-words',
            render: (row) => (
              <span className="flex flex-col">
                {row.responsible.name}
                <span className="text-muted-foreground text-xs font-normal break-all">
                  {row.responsible.email}
                </span>
                {row.responsible.personalPhone && (
                  <span className="text-muted-foreground text-xs font-normal">
                    {row.responsible.personalPhone}
                  </span>
                )}
              </span>
            ),
          },
          {
            key: 'city',
            header: 'Cidade/UF',
            sortable: true,
            render: (row) => `${row.city}/${row.state}`,
          },
          {
            key: 'createdAt',
            header: 'Cadastro',
            sortable: true,
            render: (row) => formatLocalDate(row.createdAt),
          },
          {
            key: 'deleted',
            header: 'Situação',
            sortable: true,
            render: (row) => (
              <InstitutionSituationBadges deleted={row.deleted} emailVerified={row.emailVerified} />
            ),
          },
        ]}
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        params={params}
        onParamsChange={setParams}
        rowKey={(row) => `${row.kind}-${row.id}`}
        searchPlaceholder="Buscar por nome, CNPJ, responsável, contato, endereço ou data..."
        itemLabel="instituições"
        toolbar={
          <>
            <Select
              value={type}
              onValueChange={(value) =>
                setParams({ ...params, type: value === ALL ? undefined : value, page: 1 })
              }
            >
              <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                {INSTITUTION_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {INSTITUTION_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) =>
                setParams({ ...params, status: value === ALL ? undefined : value, page: 1 })
              }
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
                <SelectItem value="deleted">{STATUS_LABELS.deleted}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        rowActions={(row) => (
          <>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-8"
            >
              <Link
                to={institutionPath(row.kind, row.id)}
                aria-label={`Ver perfil de ${publicName(row)}`}
              >
                <EyeIcon />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-8"
            >
              <Link
                to={`${institutionPath(row.kind, row.id)}/editar`}
                aria-label={`Editar ${publicName(row)}`}
              >
                <PencilIcon />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-8"
              aria-label={
                row.deleted
                  ? `Excluir permanentemente ${publicName(row)}`
                  : `Excluir ${publicName(row)}`
              }
              title={row.deleted ? 'Excluir permanentemente' : 'Excluir'}
              onClick={() => {
                const target = { kind: row.kind, id: row.id, name: publicName(row) };
                if (row.deleted) setPermanentTarget(target);
                else setSoftDeleteTarget(target);
              }}
            >
              <Trash2Icon />
            </Button>
          </>
        )}
      />

      <SoftDeleteInstitutionDialog
        target={softDeleteTarget}
        onClose={() => setSoftDeleteTarget(null)}
      />
      <DeleteInstitutionPermanentlyDialog
        target={permanentTarget}
        onClose={() => setPermanentTarget(null)}
      />
    </div>
  );
}

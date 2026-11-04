import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

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
import { useAdminListParams } from '@/features/admin/lists/use-admin-list-params';
import {
  type AdminSuggestion,
  listAdminSuggestions,
} from '@/features/admin/suggestions/admin-suggestions-api';
import { ApproveSuggestionDialog } from '@/features/admin/suggestions/approve-suggestion-dialog';
import { RejectSuggestionDialog } from '@/features/admin/suggestions/reject-suggestion-dialog';
import {
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_STATUSES,
  SUGGESTION_TYPE_LABELS,
  SUGGESTION_TYPES,
  type SuggestionStatus,
} from '@/features/suggestions/suggestion-labels';
import { formatAdminId, formatLocalDateTime } from '@/lib/format';

const FILTER_KEYS = ['type', 'status'] as const;
const ALL = 'ALL';

const STATUS_BADGE: Record<SuggestionStatus, 'secondary' | 'default' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

export function AdminSuggestionsPage() {
  const [params, setParams] = useAdminListParams(FILTER_KEYS);
  const [approving, setApproving] = useState<AdminSuggestion | null>(null);
  const [rejecting, setRejecting] = useState<AdminSuggestion | null>(null);

  const status = String(params.status ?? 'PENDING');
  const type = String(params.type ?? ALL);
  const apiParams = {
    ...params,
    status: status === ALL ? undefined : status,
  };

  const query = useQuery({
    queryKey: ['admin', 'suggestions', apiParams],
    queryFn: () => listAdminSuggestions(apiParams),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Sugestões</h1>
        <p className="text-muted-foreground text-sm">
          Novas opções para as listas padronizadas, sugeridas pelas instituições
        </p>
      </div>

      <AdminTable
        columns={[
          {
            key: 'id',
            header: 'ID',
            sortable: true,
            className: 'w-20',
            render: (row) => (
              <span className="text-muted-foreground text-xs font-normal">
                {formatAdminId(row.id)}
              </span>
            ),
          },
          {
            key: 'type',
            header: 'Tipo',
            sortable: true,
            render: (row) => SUGGESTION_TYPE_LABELS[row.type],
          },
          {
            key: 'text',
            header: 'Sugestão',
            sortable: true,
            className: 'max-w-64 whitespace-normal break-words',
            render: (row) => row.text,
          },
          {
            key: 'requesterName',
            header: 'Instituição',
            sortable: true,
            render: (row) => row.requesterName,
          },
          {
            key: 'createdAt',
            header: 'Enviada em',
            sortable: true,
            render: (row) => formatLocalDateTime(row.createdAt),
          },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (row) => (
              <Badge variant={STATUS_BADGE[row.status]}>
                {SUGGESTION_STATUS_LABELS[row.status]}
              </Badge>
            ),
          },
        ]}
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder="Buscar por ID, sugestão ou instituição..."
        itemLabel="sugestões"
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
                {SUGGESTION_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SUGGESTION_TYPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) =>
                setParams({ ...params, status: value === 'PENDING' ? undefined : value, page: 1 })
              }
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os status</SelectItem>
                {SUGGESTION_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SUGGESTION_STATUS_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        rowActions={(row) =>
          row.status === 'PENDING' ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-8"
                aria-label={`Aprovar ${row.text}`}
                onClick={() => setApproving(row)}
              >
                <CheckIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive size-8"
                aria-label={`Recusar ${row.text}`}
                onClick={() => setRejecting(row)}
              >
                <XIcon />
              </Button>
            </>
          ) : null
        }
      />

      {approving && (
        <ApproveSuggestionDialog
          key={approving.id}
          suggestion={approving}
          onClose={() => setApproving(null)}
        />
      )}
      <RejectSuggestionDialog suggestion={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}

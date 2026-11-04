import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { type ComponentType, useState } from 'react';

import { AdminTable, type AdminTableColumn } from '@/components/admin-table';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/features/admin/lists/confirm-delete-dialog';
import { adminListApi, type AdminListResource } from '@/features/admin/lists/list-api';
import { useAdminListParams } from '@/features/admin/lists/use-admin-list-params';

export interface AdminFormDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: T | null;
}

interface AdminListPageProps<T extends { id: number; usageCount: number }> {
  resource: AdminListResource;
  title: string;
  description: string;
  newLabel: string;
  itemLabel: string;
  searchPlaceholder: string;
  columns: AdminTableColumn<T>[];
  rowLabel: (row: T) => string;
  isLocked?: (row: T) => boolean;
  inUseMessage?: string;
  FormDialog: ComponentType<AdminFormDialogProps<T>>;
}

export function AdminListPage<T extends { id: number; usageCount: number }>({
  resource,
  title,
  description,
  newLabel,
  itemLabel,
  searchPlaceholder,
  columns,
  rowLabel,
  isLocked,
  inUseMessage,
  FormDialog,
}: AdminListPageProps<T>) {
  const [params, setParams] = useAdminListParams();
  const [editing, setEditing] = useState<{ row: T | null } | null>(null);
  const [deleting, setDeleting] = useState<{ id: number; label: string } | null>(null);

  const query = useQuery({
    queryKey: ['admin', resource, params],
    queryFn: () => adminListApi<T, unknown>(resource).list(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Button type="button" onClick={() => setEditing({ row: null })} className="self-start">
          <PlusIcon />
          {newLabel}
        </Button>
      </div>

      <AdminTable
        columns={columns}
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder={searchPlaceholder}
        itemLabel={itemLabel}
        rowActions={(row) => {
          if (isLocked?.(row)) return null;
          const inUse = row.usageCount > 0;
          return (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-8"
                aria-label={`Editar ${rowLabel(row)}`}
                onClick={() => setEditing({ row })}
              >
                <PencilIcon />
              </Button>
              <span title={inUse ? inUseMessage : undefined}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-8"
                  aria-label={`Excluir ${rowLabel(row)}`}
                  disabled={inUse}
                  onClick={() => setDeleting({ id: row.id, label: rowLabel(row) })}
                >
                  <Trash2Icon />
                </Button>
              </span>
            </>
          );
        }}
      />

      <FormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        initial={editing?.row ?? null}
      />
      <ConfirmDeleteDialog
        resource={resource}
        target={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

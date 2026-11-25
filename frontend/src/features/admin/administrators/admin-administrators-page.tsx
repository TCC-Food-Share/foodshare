import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { AdministratorFormDialog } from '@/features/admin/administrators/administrator-form-dialog';
import {
  type AdminAdministrator,
  ADMINISTRATORS_QUERY_KEY,
  administratorsApi,
} from '@/features/admin/administrators/administrators-api';
import { DeleteAdministratorDialog } from '@/features/admin/administrators/delete-administrator-dialog';
import { useAdminListParams } from '@/features/admin/lists/use-admin-list-params';
import { useAuth } from '@/features/auth/use-auth';
import { formatAdminId } from '@/lib/format';

interface DialogState {
  open: boolean;
  row: AdminAdministrator | null;
}

const CLOSED: DialogState = { open: false, row: null };

export function AdminAdministratorsPage() {
  const { user } = useAuth();
  const [params, setParams] = useAdminListParams();
  // A linha continua no estado ao fechar, para o diálogo não trocar de conteúdo na animação.
  const [editing, setEditing] = useState<DialogState>(CLOSED);
  const [deleting, setDeleting] = useState<DialogState>(CLOSED);

  const query = useQuery({
    queryKey: [...ADMINISTRATORS_QUERY_KEY, params],
    queryFn: () => administratorsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const isSelf = (row: AdminAdministrator) => user?.id === String(row.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Administradores</h1>
          <p className="text-muted-foreground text-sm">
            Contas com acesso ao painel administrativo
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditing({ open: true, row: null })}
          className="self-start"
        >
          <PlusIcon />
          Novo administrador
        </Button>
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
            key: 'image',
            header: 'Imagem',
            className: 'w-20',
            render: (row) => (
              <UserAvatar image={row.image} name={row.name} className="size-8 text-xs" />
            ),
          },
          {
            key: 'name',
            header: 'Nome',
            sortable: true,
            render: (row) => (
              <span className="flex flex-wrap items-center gap-2">
                {row.name}
                {isSelf(row) && <span className="text-muted-foreground text-xs">(você)</span>}
                {!row.emailVerified && (
                  <Badge
                    variant="secondary"
                    title="Ainda não confirmou o e-mail. Sem confirmação em 24 horas, o cadastro é apagado."
                  >
                    Aguardando confirmação
                  </Badge>
                )}
              </span>
            ),
          },
          {
            key: 'email',
            header: 'E-mail',
            sortable: true,
            className: 'break-all',
            render: (row) => row.email,
          },
        ]}
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder="Buscar por ID, nome ou e-mail..."
        itemLabel="administradores"
        rowActions={(row) => (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-8"
              aria-label={`Editar ${row.name}`}
              onClick={() => setEditing({ open: true, row })}
            >
              <PencilIcon />
            </Button>
            {!isSelf(row) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive size-8"
                aria-label={`Excluir ${row.name}`}
                onClick={() => setDeleting({ open: true, row })}
              >
                <Trash2Icon />
              </Button>
            )}
          </>
        )}
      />

      <AdministratorFormDialog
        open={editing.open}
        onOpenChange={(open) => !open && setEditing((state) => ({ ...state, open: false }))}
        initial={editing.row}
      />
      <DeleteAdministratorDialog
        open={deleting.open}
        target={deleting.row}
        onClose={() => setDeleting((state) => ({ ...state, open: false }))}
      />
    </div>
  );
}

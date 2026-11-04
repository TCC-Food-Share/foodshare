import { MessageSquareXIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { AdminListPage } from '@/features/admin/lists/admin-list-page';
import type { AdminCancellationReason } from '@/features/admin/lists/list-api';
import { createTextOptionFormDialog } from '@/features/admin/lists/text-option-form-dialog';
import { formatAdminId } from '@/lib/format';

const ReasonFormDialog = createTextOptionFormDialog<AdminCancellationReason>({
  resource: 'cancellation-reasons',
  field: 'name',
  icon: MessageSquareXIcon,
  newTitle: 'Novo motivo',
  editTitle: 'Editar motivo',
  description: 'Motivos que as instituições escolhem ao cancelar um pedido',
  label: 'Motivo',
  placeholder: 'Ex: Estabelecimento fechado',
  maxLength: 200,
  successNew: 'Motivo cadastrado.',
  successEdit: 'Motivo atualizado.',
});

export function AdminCancellationReasonsPage() {
  return (
    <AdminListPage<AdminCancellationReason>
      resource="cancellation-reasons"
      title="Motivos de Cancelamento"
      description="Motivos padronizados utilizados ao cancelar pedidos"
      newLabel="Novo motivo"
      itemLabel="motivos"
      searchPlaceholder="Buscar por ID ou motivo..."
      rowLabel={(row) => row.name}
      isLocked={(row) => row.isSystem}
      inUseMessage="Há pedidos cancelados com este motivo."
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
          key: 'name',
          header: 'Motivo',
          sortable: true,
          render: (row) => (
            <span className="flex items-center gap-2">
              {row.name}
              {row.isSystem && (
                <Badge
                  variant="secondary"
                  title="Usado nos cancelamentos automáticos; não pode ser alterado."
                >
                  Sistema
                </Badge>
              )}
            </span>
          ),
        },
        {
          key: 'usageCount',
          header: 'Pedidos',
          sortable: true,
          className: 'w-32',
          render: (row) => row.usageCount,
        },
      ]}
      FormDialog={ReasonFormDialog}
    />
  );
}

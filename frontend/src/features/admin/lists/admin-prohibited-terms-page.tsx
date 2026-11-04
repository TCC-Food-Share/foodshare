import { BanIcon } from 'lucide-react';

import { AdminListPage } from '@/features/admin/lists/admin-list-page';
import type { AdminProhibitedTerm } from '@/features/admin/lists/list-api';
import { createTextOptionFormDialog } from '@/features/admin/lists/text-option-form-dialog';
import { formatAdminId } from '@/lib/format';

const TermFormDialog = createTextOptionFormDialog<AdminProhibitedTerm>({
  resource: 'prohibited-terms',
  field: 'term',
  icon: BanIcon,
  newTitle: 'Novo termo proibido',
  editTitle: 'Editar termo proibido',
  description: 'O termo é gravado em minúsculas e sem acentos',
  label: 'Termo',
  placeholder: 'Ex: ofensa',
  maxLength: 100,
  successNew: 'Termo cadastrado.',
  successEdit: 'Termo atualizado.',
});

export function AdminProhibitedTermsPage() {
  return (
    <AdminListPage<AdminProhibitedTerm>
      resource="prohibited-terms"
      title="Termos Proibidos"
      description="Palavras bloqueadas nos campos de texto livre da plataforma"
      newLabel="Novo termo"
      itemLabel="termos"
      searchPlaceholder="Buscar por ID ou termo..."
      rowLabel={(row) => row.term}
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
        { key: 'term', header: 'Termo', sortable: true, render: (row) => row.term },
      ]}
      FormDialog={TermFormDialog}
    />
  );
}

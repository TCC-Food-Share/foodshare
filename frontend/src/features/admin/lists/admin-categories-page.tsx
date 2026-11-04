import { TagsIcon } from 'lucide-react';

import { AdminListPage } from '@/features/admin/lists/admin-list-page';
import type { AdminCategory } from '@/features/admin/lists/list-api';
import { createTextOptionFormDialog } from '@/features/admin/lists/text-option-form-dialog';
import { formatAdminId } from '@/lib/format';

const CategoryFormDialog = createTextOptionFormDialog<AdminCategory>({
  resource: 'categories',
  field: 'name',
  icon: TagsIcon,
  newTitle: 'Nova categoria',
  editTitle: 'Editar categoria',
  description: 'Categorias agrupam os itens do catálogo de alimentos',
  label: 'Nome da categoria',
  placeholder: 'Ex: Congelados',
  maxLength: 100,
  successNew: 'Categoria cadastrada.',
  successEdit: 'Categoria atualizada.',
});

export function AdminCategoriesPage() {
  return (
    <AdminListPage<AdminCategory>
      resource="categories"
      title="Categorias"
      description="Categorias de alimentos disponíveis para classificação"
      newLabel="Nova categoria"
      itemLabel="categorias"
      searchPlaceholder="Buscar por ID ou nome..."
      rowLabel={(row) => row.name}
      inUseMessage="Há itens do catálogo nesta categoria."
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
        { key: 'name', header: 'Nome da categoria', sortable: true, render: (row) => row.name },
        {
          key: 'usageCount',
          header: 'Itens no catálogo',
          sortable: true,
          className: 'w-40',
          render: (row) => row.usageCount,
        },
      ]}
      FormDialog={CategoryFormDialog}
    />
  );
}

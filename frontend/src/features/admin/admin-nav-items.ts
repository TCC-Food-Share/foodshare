import {
  AppleIcon,
  BanIcon,
  BookOpenIcon,
  Building2Icon,
  ClipboardListIcon,
  LightbulbIcon,
  type LucideIcon,
  MessageSquareXIcon,
  RulerIcon,
  TagsIcon,
  UserCogIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Gestão',
    items: [
      { label: 'Administradores', to: '/admin/administradores', icon: UserCogIcon },
      { label: 'Instituições', to: '/admin/instituicoes', icon: Building2Icon },
      { label: 'Alimentos', to: '/admin/alimentos', icon: AppleIcon },
      { label: 'Pedidos', to: '/admin/pedidos', icon: ClipboardListIcon },
      { label: 'Sugestões', to: '/admin/sugestoes', icon: LightbulbIcon },
    ],
  },
  {
    label: 'Listas padronizadas',
    items: [
      { label: 'Categorias', to: '/admin/categorias', icon: TagsIcon },
      { label: 'Catálogo de alimentos', to: '/admin/catalogo', icon: BookOpenIcon },
      { label: 'Unidades de medida', to: '/admin/unidades', icon: RulerIcon },
      { label: 'Motivos de cancelamento', to: '/admin/motivos', icon: MessageSquareXIcon },
      { label: 'Termos proibidos', to: '/admin/termos-proibidos', icon: BanIcon },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

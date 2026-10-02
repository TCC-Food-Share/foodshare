import { InboxIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { Role } from '@/features/auth/auth-context';
import { ORDER_STATUS, type OrderStatusName } from '@/features/orders/order-status';

interface EmptyCopy {
  title: string;
  description: string;
}

const EMPTY_COPY: Record<Role, Record<OrderStatusName, EmptyCopy>> = {
  establishment: {
    [ORDER_STATUS.PENDING]: {
      title: 'Nenhum pedido pendente',
      description: 'Novas solicitações de doação aparecem aqui.',
    },
    [ORDER_STATUS.IN_PROGRESS]: {
      title: 'Nenhum pedido em andamento',
      description: 'Os pedidos que você aceitar ficam aqui até a entidade confirmar o recebimento.',
    },
    [ORDER_STATUS.REJECTED]: {
      title: 'Nenhum pedido rejeitado',
      description: 'Os pedidos que você rejeitar aparecem aqui.',
    },
    [ORDER_STATUS.DONATED]: {
      title: 'Nenhum pedido doado',
      description: 'Doações confirmadas pelas entidades aparecem aqui.',
    },
    [ORDER_STATUS.CANCELLED]: {
      title: 'Nenhum pedido cancelado',
      description: 'Pedidos cancelados aparecem aqui.',
    },
  },
  beneficiary: {
    [ORDER_STATUS.PENDING]: {
      title: 'Você não tem pedidos pendentes',
      description: 'Encontre um alimento no feed e solicite uma doação.',
    },
    [ORDER_STATUS.IN_PROGRESS]: {
      title: 'Nenhum pedido em andamento',
      description: 'Quando um estabelecimento aceitar sua solicitação, ela aparece aqui.',
    },
    [ORDER_STATUS.REJECTED]: {
      title: 'Nenhum pedido rejeitado',
      description: 'Solicitações recusadas pelos estabelecimentos aparecem aqui.',
    },
    [ORDER_STATUS.DONATED]: {
      title: 'Nenhum pedido doado',
      description: 'Doações com o recebimento confirmado por você aparecem aqui.',
    },
    [ORDER_STATUS.CANCELLED]: {
      title: 'Nenhum pedido cancelado',
      description: 'Pedidos cancelados aparecem aqui.',
    },
  },
};

interface OrdersEmptyStateProps {
  status: OrderStatusName;
  role: Role | null;
}

export function OrdersEmptyState({ status, role }: OrdersEmptyStateProps) {
  const copy = EMPTY_COPY[role ?? 'beneficiary'][status];
  const showFeedShortcut = role === 'beneficiary' && status === ORDER_STATUS.PENDING;

  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <InboxIcon className="text-muted-foreground size-10" />
      <div className="flex flex-col gap-1">
        <p className="text-foreground font-medium">{copy.title}</p>
        <p className="text-muted-foreground text-sm">{copy.description}</p>
      </div>
      {showFeedShortcut && (
        <Button variant="outline" size="sm" asChild>
          <Link to="/feed">Ver alimentos</Link>
        </Button>
      )}
    </div>
  );
}

import { InboxIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { Role } from '@/features/auth/auth-context';
import type { OrderStatusName } from '@/features/orders/orders-api';

interface EmptyCopy {
  title: string;
  description: string;
}

const EMPTY_COPY: Record<Role, Record<OrderStatusName, EmptyCopy>> = {
  establishment: {
    Pendente: {
      title: 'Nenhum pedido pendente',
      description: 'Novas solicitações de doação aparecem aqui.',
    },
    Aceito: {
      title: 'Nenhum pedido aceito',
      description: 'Os pedidos que você aceitar ficam aqui até serem recebidos.',
    },
    Rejeitado: {
      title: 'Nenhum pedido rejeitado',
      description: 'Os pedidos que você rejeitar aparecem aqui.',
    },
    Recebido: {
      title: 'Nenhum pedido recebido',
      description: 'Doações confirmadas pelas entidades aparecem aqui.',
    },
  },
  beneficiary: {
    Pendente: {
      title: 'Você não tem pedidos pendentes',
      description: 'Encontre um alimento no feed e solicite uma doação.',
    },
    Aceito: {
      title: 'Nenhum pedido aceito',
      description: 'Quando um estabelecimento aceitar sua solicitação, ela aparece aqui.',
    },
    Rejeitado: {
      title: 'Nenhum pedido rejeitado',
      description: 'Solicitações recusadas pelos estabelecimentos aparecem aqui.',
    },
    Recebido: {
      title: 'Nenhum pedido recebido',
      description: 'Doações com o recebimento confirmado por você aparecem aqui.',
    },
  },
};

interface OrdersEmptyStateProps {
  status: OrderStatusName;
  role: Role | null;
}

export function OrdersEmptyState({ status, role }: OrdersEmptyStateProps) {
  const copy = EMPTY_COPY[role ?? 'beneficiary'][status];
  const showFeedShortcut = role === 'beneficiary' && status === 'Pendente';

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

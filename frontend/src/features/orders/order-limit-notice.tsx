import { TriangleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ORDERS_IN_PROGRESS_LIMIT } from '@/features/orders/use-orders-in-progress';

export function OrderLimitNotice({ className }: { className?: string }) {
  return (
    <Alert variant="warning" className={className}>
      <TriangleAlertIcon />
      <AlertTitle className="line-clamp-none">Limite de pedidos em andamento atingido</AlertTitle>
      <AlertDescription>
        Sua entidade já tem {ORDERS_IN_PROGRESS_LIMIT} pedidos em andamento (pendentes ou aceitos) e
        não pode fazer novas solicitações por enquanto. Para liberar espaço, confirme o recebimento
        dos pedidos aceitos ou aguarde a resposta dos pendentes.
      </AlertDescription>
    </Alert>
  );
}

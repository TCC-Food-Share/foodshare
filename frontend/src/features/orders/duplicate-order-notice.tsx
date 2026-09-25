import { TriangleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DuplicateOrderNotice({ className }: { className?: string }) {
  return (
    <Alert variant="warning" className={className}>
      <TriangleAlertIcon />
      <AlertTitle className="line-clamp-none">
        Sua entidade já tem um pedido em andamento para este alimento
      </AlertTitle>
      <AlertDescription>
        Esse pedido ainda está pendente ou aceito. Acompanhe em Meus pedidos; quando ele for
        concluído, você poderá solicitar este alimento novamente.
      </AlertDescription>
    </Alert>
  );
}

import { CircleAlertIcon, Loader2Icon, SaveIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminFoodEditImpact } from '@/features/admin/foods/admin-foods-api';

/** DT58: shown before saving when the edit changes pending orders. */
export function EditImpactDialog({
  impact,
  saving,
  onConfirm,
  onClose,
}: {
  impact: AdminFoodEditImpact | null;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={impact !== null} onOpenChange={(next) => !next && !saving && onClose()}>
      {impact && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Esta edição afeta pedidos pendentes</DialogTitle>
            <DialogDescription>
              Confira antes de salvar. Pedido rejeitado não volta.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <CircleAlertIcon />
            <AlertDescription>
              <ul className="list-disc pl-4">
                {impact.ordersToReject > 0 && (
                  <li>{impact.ordersToReject} pedido(s) pendente(s) serão rejeitados.</li>
                )}
                {impact.ordersToUpdate > 0 && (
                  <li>
                    {impact.ordersToUpdate} pedido(s) do tipo total passarão a pedir a nova
                    quantidade.
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Voltar
            </Button>
            <Button type="button" onClick={onConfirm} disabled={saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Salvar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

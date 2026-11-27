import { useQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';

import { SearchableSelect } from '@/components/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import type { AdminInstitutionKind } from '@/features/admin/institutions/institution-kind';
import {
  INSTITUTIONS_QUERY_KEY,
  institutionsApi,
} from '@/features/admin/institutions/institutions-api';

interface SoftDeleteFieldsProps {
  kind: AdminInstitutionKind;
  id: number;
  /** "Ao salvar" in the edit page, "Ao confirmar" in the dialog. */
  trigger: string;
  reasonId: string;
  onReasonChange: (reasonId: string) => void;
  reasonError: string | null;
}

/**
 * Impact of the soft delete (RN28/RN29) and the reason select (RN30), shared by the edit page and
 * the "Excluir" dialog so both show the same text (DT49).
 */
export function SoftDeleteFields({
  kind,
  id,
  trigger,
  reasonId,
  onReasonChange,
  reasonError,
}: SoftDeleteFieldsProps) {
  const impact = useQuery({
    queryKey: [...INSTITUTIONS_QUERY_KEY, 'impact', kind, id],
    queryFn: () => institutionsApi.impact(kind, id),
  });
  const reasons = useQuery({
    queryKey: ['admin', 'cancellation-reasons', 'options'],
    queryFn: institutionsApi.cancellationReasonOptions,
  });

  return (
    <>
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>
          {impact.isLoading ? (
            'Calculando os pedidos afetados…'
          ) : impact.data ? (
            kind === 'ESTABLISHMENT' ? (
              <>
                {trigger}, {impact.data.pendingOrders} pedido(s) pendente(s) serão rejeitados e{' '}
                {impact.data.inProgressOrders} pedido(s) em andamento serão cancelados. Todos os
                alimentos saem do ar, e a conta deixa de entrar.
              </>
            ) : (
              <>
                {trigger}, {impact.data.pendingOrders} pedido(s) pendente(s) e{' '}
                {impact.data.inProgressOrders} pedido(s) em andamento serão cancelados, e as
                quantidades reservadas voltam aos alimentos. A conta deixa de entrar.
              </>
            )
          ) : (
            'Não foi possível calcular os pedidos afetados.'
          )}
        </AlertDescription>
      </Alert>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`cancellation-reason-${kind}-${id}`}>Motivo dos pedidos cancelados</Label>
        <SearchableSelect
          id={`cancellation-reason-${kind}-${id}`}
          options={(reasons.data ?? []).map((reason) => ({
            value: String(reason.id),
            label: reason.name,
          }))}
          value={reasonId}
          onChange={onReasonChange}
          placeholder={reasons.isLoading ? 'Carregando motivos…' : 'Selecione o motivo'}
          searchPlaceholder="Buscar motivo..."
          emptyMessage="Nenhum motivo encontrado."
          invalid={reasonError !== null}
        />
        {reasonError && <p className="text-destructive text-sm">{reasonError}</p>}
      </div>
    </>
  );
}

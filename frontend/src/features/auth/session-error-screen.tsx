import { CircleAlertIcon, RotateCwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function SessionErrorScreen({
  tooManyRequests,
  onRetry,
}: {
  tooManyRequests: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div role="alert" className="flex max-w-sm flex-col items-center gap-3 text-center">
        <CircleAlertIcon className="text-destructive size-8" />
        <p className="text-foreground font-medium">Não foi possível carregar o Food Share.</p>
        <p className="text-muted-foreground text-sm">
          {tooManyRequests
            ? 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.'
            : 'Verifique sua conexão com a internet e tente de novo.'}
        </p>
        <Button type="button" variant="outline" onClick={onRetry} className="mt-2">
          <RotateCwIcon />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CircleAlertIcon, LightbulbIcon, Loader2Icon, SendIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SUGGESTION_TYPE_LABELS,
  SUGGESTION_TYPES,
  type SuggestionType,
} from '@/features/suggestions/suggestion-labels';
import { api, ApiError } from '@/lib/api';
import { PROHIBITED_CONTENT_MESSAGE, prohibitedContentFields } from '@/lib/prohibited-content';

export interface SuggestionDraft {
  type: SuggestionType;
  text: string;
}

const schema = z.object({
  type: z.enum(SUGGESTION_TYPES),
  text: z.string().trim().min(1, 'Informe a sua sugestão.').max(200),
});
type Values = z.infer<typeof schema>;

const CONFLICT_MESSAGES: Record<string, string> = {
  SUGGESTION_OPTION_EXISTS: 'Esta opção já existe na lista. Procure por ela no campo de seleção.',
  SUGGESTION_ALREADY_PENDING: 'Esta opção já foi sugerida e aguarda avaliação.',
};

function conflictMessage(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined;
  const body = error.body;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? CONFLICT_MESSAGES[body.code]
    : undefined;
}

interface SuggestOptionDialogProps {
  draft: SuggestionDraft | null;
  onClose: () => void;
}

export function SuggestOptionDialog({ draft, onClose }: SuggestOptionDialogProps) {
  const [genericError, setGenericError] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { type: 'FOOD_CATALOG_ITEM', text: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => api.post('/suggestions', values),
  });

  const [previousDraft, setPreviousDraft] = useState(draft);
  if (draft !== previousDraft) {
    setPreviousDraft(draft);
    if (draft) {
      form.reset(draft);
      setGenericError(false);
    }
  }

  async function onSubmit(values: Values) {
    setGenericError(false);
    try {
      await mutation.mutateAsync(values);
      toast.success('Sugestão enviada. Nossa equipe irá analisá-la.');
      onClose();
    } catch (error) {
      const message = prohibitedContentFields(error).includes('text')
        ? PROHIBITED_CONTENT_MESSAGE
        : conflictMessage(error);
      if (message) {
        form.setError('text', { message });
        return;
      }
      setGenericError(true);
    }
  }

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <LightbulbIcon className="text-primary-foreground size-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <DialogTitle>Sugerir nova opção</DialogTitle>
              <DialogDescription>
                Nossa equipe irá analisar sua sugestão. Enquanto isso, siga com a opção mais
                próxima.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit(onSubmit)(event);
            }}
          >
            {genericError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>
                  Não foi possível enviar a sugestão. Tente novamente em instantes.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUGGESTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {SUGGESTION_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sugestão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pão de queijo" maxLength={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                Enviar sugestão
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import type { Control } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { SignUpInput } from '@/features/auth/sign-up/sign-up-schema';
import { TextField } from '@/features/auth/sign-up/text-field';
import { CNPJ_MASK, PHONE_MASK, phoneModify } from '@/lib/masks';

export function InstitutionalStep({ control }: { control: Control<SignUpInput> }) {
  return (
    <div className="flex flex-col gap-5">
      <TextField
        control={control}
        name="companyName"
        label="Razão social"
        autoComplete="organization"
        placeholder="Nome da empresa"
      />
      <TextField
        control={control}
        name="tradeName"
        label="Nome fantasia"
        optional
        placeholder="Nome fantasia"
      />
      <TextField
        control={control}
        name="cnpj"
        label="CNPJ"
        mask={CNPJ_MASK}
        placeholder="00.000.000/0000-00"
      />
      <TextField
        control={control}
        name="institutionalEmail"
        label="E-mail institucional"
        type="email"
        autoComplete="email"
        placeholder="contato@organizacao.com"
      />
      <TextField
        control={control}
        name="institutionalPhone"
        label="Celular institucional"
        mask={PHONE_MASK}
        modify={phoneModify}
        autoComplete="tel"
        placeholder="(00) 00000-0000"
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Textarea maxLength={2000} placeholder="Conte sobre sua organização..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

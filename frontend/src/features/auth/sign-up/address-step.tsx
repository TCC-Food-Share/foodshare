import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MaskedInput } from '@/components/ui/masked-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CityAutocomplete } from '@/features/auth/sign-up/city-autocomplete';
import { CEP_MASK } from '@/features/auth/sign-up/masks';
import { type SignUpInput, UFS } from '@/features/auth/sign-up/sign-up-schema';
import { TextField } from '@/features/auth/sign-up/text-field';
import { lookupCep } from '@/features/auth/sign-up/viacep';

type CepStatus = 'idle' | 'loading' | 'notfound';

export function AddressStep() {
  const form = useFormContext<SignUpInput>();
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');
  const uf = useWatch({ control: form.control, name: 'state' });

  async function handleCepBlur(cep: string) {
    if (cep.replace(/\D/g, '').length !== 8) {
      setCepStatus('idle');
      return;
    }
    setCepStatus('loading');
    const found = await lookupCep(cep);
    if (!found) {
      setCepStatus('notfound');
      return;
    }
    setCepStatus('idle');
    if (found.state) form.setValue('state', found.state, { shouldValidate: true });
    if (found.street) form.setValue('street', found.street, { shouldValidate: true });
    if (found.city) form.setValue('city', found.city, { shouldValidate: true });
    form.setFocus('number');
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField
        control={form.control}
        name="postalCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CEP</FormLabel>
            <div className="relative">
              <FormControl>
                <MaskedInput
                  mask={CEP_MASK}
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  name={field.name}
                  ref={field.ref}
                  defaultValue={field.value}
                  onChange={field.onChange}
                  onBlur={(e) => {
                    field.onBlur();
                    void handleCepBlur(e.target.value);
                  }}
                />
              </FormControl>
              {cepStatus === 'loading' && (
                <Loader2Icon className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
              )}
            </div>
            {cepStatus === 'notfound' ? (
              <p className="text-muted-foreground text-sm">
                CEP não encontrado. Preencha o endereço manualmente.
              </p>
            ) : (
              <FormMessage />
            )}
          </FormItem>
        )}
      />

      <TextField
        control={form.control}
        name="street"
        label="Logradouro"
        autoComplete="address-line1"
        placeholder="Rua, avenida…"
      />

      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <TextField
          control={form.control}
          name="number"
          label="Número"
          inputMode="numeric"
          placeholder="000"
        />
        <TextField
          control={form.control}
          name="complement"
          label="Complemento"
          optional
          autoComplete="address-line2"
          placeholder="Sala, bloco, ponto de referência…"
        />
      </div>

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <CityAutocomplete key={uf || 'no-uf'} uf={uf} />
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UF</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue('city', '');
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {UFS.map((sigla) => (
                    <SelectItem key={sigla} value={sigla}>
                      {sigla}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

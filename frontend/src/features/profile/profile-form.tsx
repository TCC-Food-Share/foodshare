import { Loader2Icon, LockIcon, MapPinIcon } from 'lucide-react';
import { useState } from 'react';
import type { Control } from 'react-hook-form';
import { useFormContext, useWatch } from 'react-hook-form';

import { CityAutocomplete } from '@/components/city-autocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/ui/masked-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Role } from '@/features/auth/auth-context';
import type { ProfileResponse } from '@/features/profile/profile-api';
import type { ProfileFormInput } from '@/features/profile/profile-schema';
import { CEP_MASK, phoneMaskFor, phoneModify } from '@/lib/masks';
import { UFS } from '@/lib/validation';
import { lookupCep } from '@/lib/viacep';

const ROLE_LABEL: Record<Role, string> = {
  establishment: 'Estabelecimento',
  beneficiary: 'Entidade beneficiária',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground flex items-center gap-1.5">
        {label}
        <LockIcon className="size-3" />
      </Label>
      <Input value={value} disabled readOnly />
    </div>
  );
}

type CepStatus = 'idle' | 'loading' | 'notfound';

export function ProfileForm({
  control,
  data,
  role,
  submitting,
  onCancel,
  onSubmit,
}: {
  control: Control<ProfileFormInput>;
  data: ProfileResponse;
  role: Role;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const form = useFormContext<ProfileFormInput>();
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');
  const uf = useWatch({ control, name: 'state' });

  // Computed once from `data` (stable while editing) — never from `field.value`,
  // which changes on every keystroke and would fight `modify`'s own mask swaps.
  const institutionalPhoneMask = phoneMaskFor(data.institutionalPhone);
  const personalPhoneMask = phoneMaskFor(data.user.personalPhone);

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
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center gap-4">
          {data.user.image ? (
            <img src={data.user.image} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-full text-lg font-medium">
              {initials(data.companyName)}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{data.companyName}</span>
              <span className="bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                {ROLE_LABEL[role]}
              </span>
            </div>
            {data.tradeName && (
              <span className="text-muted-foreground text-sm">{data.tradeName}</span>
            )}
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPinIcon className="size-3" />
              {data.address.city}, {data.address.state}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1">
              <LockedField label="Razão social" value={data.companyName} />
            </div>
            <div className="flex-1">
              <LockedField label="Nome fantasia" value={data.tradeName ?? ''} />
            </div>
          </div>
          <FormField
            control={control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL da imagem/logotipo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://…"
                    autoComplete="off"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados institucionais</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LockedField label="CNPJ" value={data.cnpj} />
            <FormField
              control={control}
              name="institutionalEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail institucional</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="institutionalPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular institucional</FormLabel>
                  <FormControl>
                    <MaskedInput
                      mask={institutionalPhoneMask}
                      modify={phoneModify}
                      autoComplete="tel"
                      name={field.name}
                      ref={field.ref}
                      defaultValue={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato do responsável</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LockedField label="Nome" value={data.user.name} />
            <LockedField label="E-mail" value={data.user.email} />
            <FormField
              control={control}
              name="personalPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular pessoal</FormLabel>
                  <FormControl>
                    <MaskedInput
                      mask={personalPhoneMask}
                      modify={phoneModify}
                      autoComplete="tel"
                      name={field.name}
                      ref={field.ref}
                      defaultValue={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            control={control}
            name="postalCode"
            render={({ field }) => (
              <FormItem className="max-w-40">
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

          <FormField
            control={control}
            name="street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logradouro</FormLabel>
                <FormControl>
                  <Input autoComplete="address-line1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <FormField
              control={control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="complement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Complemento{' '}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input autoComplete="address-line2" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <FormField
              control={control}
              name="city"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <CityAutocomplete
                      key={uf || 'no-uf'}
                      uf={uf}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      inputRef={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea maxLength={2000} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1" disabled={submitting} onClick={onSubmit}>
          {submitting && <Loader2Icon className="animate-spin" />}
          {submitting ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  );
}

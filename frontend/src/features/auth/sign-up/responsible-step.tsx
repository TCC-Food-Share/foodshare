import { CircleAlertIcon } from 'lucide-react';
import type { Control } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { PHONE_MASK, phoneModify } from '@/features/auth/sign-up/masks';
import type { SignUpInput } from '@/features/auth/sign-up/sign-up-schema';
import { TextField } from '@/features/auth/sign-up/text-field';

export function ResponsibleStep({
  control,
  dupPersonal,
}: {
  control: Control<SignUpInput>;
  dupPersonal: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {dupPersonal && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            Um dado pessoal (e-mail ou celular) já está cadastrado. Revise os dois campos.
          </AlertDescription>
        </Alert>
      )}

      <TextField
        control={control}
        name="name"
        label="Nome do responsável"
        autoComplete="name"
        placeholder="Nome completo"
      />
      <TextField
        control={control}
        name="email"
        label="E-mail de acesso"
        type="email"
        autoComplete="email"
        placeholder="seu@email.com"
      />
      <TextField
        control={control}
        name="personalPhone"
        label="Celular pessoal"
        mask={PHONE_MASK}
        modify={phoneModify}
        autoComplete="tel"
        placeholder="(00) 00000-0000"
      />
      <TextField
        control={control}
        name="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
      />
      <TextField
        control={control}
        name="passwordConfirmation"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        placeholder="Repita a senha"
      />
    </div>
  );
}

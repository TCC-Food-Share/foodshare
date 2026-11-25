import { z } from 'zod';

// Mesmas regras do cadastro e da rota de redefinição do backend (8 a 72).
export const passwordField = z
  .string()
  .min(8, 'Mínimo de 8 caracteres.')
  .max(72, 'Máximo de 72 caracteres.');

export const passwordConfirmationField = z.string().min(1, 'Confirme a senha.');

const passwordPairSchema = z.object({
  password: passwordField,
  passwordConfirmation: passwordConfirmationField,
});

export const PASSWORDS_MISMATCH = {
  path: ['passwordConfirmation'],
  error: 'As senhas não conferem.',
  // Confere assim que as duas senhas forem válidas, mesmo com erro em outro
  // campo do formulário (ex.: a foto, última etapa do cadastro).
  when: (payload: { value: unknown }) => passwordPairSchema.safeParse(payload.value).success,
};

export function passwordsMatch(values: { password: string; passwordConfirmation: string }) {
  return values.password === values.passwordConfirmation;
}

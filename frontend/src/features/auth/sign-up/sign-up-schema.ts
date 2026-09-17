import { z } from 'zod';

import { PHONE_REGEX, POSTAL_CODE_REGEX, UF_REGEX, UFS } from '@/lib/validation';

export { UFS };

// CNPJ is only collected at sign-up (profile editing never touches it — RF06).
const CNPJ_RE = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
const PHONE_RE = PHONE_REGEX;
const POSTAL_CODE_RE = POSTAL_CODE_REGEX;
const UF_RE = UF_REGEX;

const emailField = (required: string) =>
  z
    .string()
    .min(1, required)
    .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' }).max(200));

const phoneField = (required: string) =>
  z.string().min(1, required).regex(PHONE_RE, 'Telefone inválido.');

export const signUpSchema = z
  .object({
    profileType: z.enum(['establishment', 'beneficiary'], { error: 'Selecione um perfil.' }),

    companyName: z.string().min(1, 'Informe a razão social.').max(300),
    tradeName: z.string().max(200),
    cnpj: z.string().min(1, 'Informe o CNPJ.').regex(CNPJ_RE, 'CNPJ inválido.'),
    institutionalEmail: emailField('Informe o e-mail institucional.'),
    institutionalPhone: phoneField('Informe o celular institucional.'),
    description: z.string().min(1, 'Escreva uma descrição.').max(2000),

    name: z.string().min(1, 'Informe o nome do responsável.').max(200),
    email: emailField('Informe o e-mail de acesso.'),
    personalPhone: phoneField('Informe o celular pessoal.'),
    password: z.string().min(8, 'Mínimo de 8 caracteres.').max(72, 'Máximo de 72 caracteres.'),
    passwordConfirmation: z.string().min(1, 'Confirme a senha.'),

    postalCode: z.string().min(1, 'Informe o CEP.').regex(POSTAL_CODE_RE, 'CEP inválido.'),
    street: z.string().min(1, 'Informe o logradouro.').max(300),
    number: z.string().min(1, 'Informe o número.').max(10),
    complement: z.string().max(200),
    city: z.string().min(1, 'Informe a cidade.').max(200),
    state: z.string().min(1, 'Selecione a UF.').regex(UF_RE, 'UF inválida.'),
  })
  .refine((v) => v.password === v.passwordConfirmation, {
    path: ['passwordConfirmation'],
    error: 'As senhas não conferem.',
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const STEP_FIELDS = [
  ['profileType'],
  ['companyName', 'tradeName', 'cnpj', 'institutionalEmail', 'institutionalPhone', 'description'],
  ['name', 'email', 'personalPhone', 'password', 'passwordConfirmation'],
  ['postalCode', 'street', 'number', 'complement', 'city', 'state'],
] as const satisfies ReadonlyArray<ReadonlyArray<keyof SignUpInput>>;

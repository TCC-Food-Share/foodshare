import { z } from 'zod';

export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

// Mirrored from the backend's class-validator regexes (create-*.dto.ts / address.dto.ts) — keep in sync.
const PHONE_RE = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;
const CNPJ_RE = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
const POSTAL_CODE_RE = /^\d{5}-?\d{3}$/;
const UF_RE = /^[A-Z]{2}$/;

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

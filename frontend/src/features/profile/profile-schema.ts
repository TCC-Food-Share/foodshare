import { z } from 'zod';

import type { ProfileResponse } from '@/features/profile/profile-api';
import { PHONE_REGEX, POSTAL_CODE_REGEX, UF_REGEX } from '@/lib/validation';

const emailField = (required: string) =>
  z
    .string()
    .min(1, required)
    .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' }).max(200));

const phoneField = (required: string) =>
  z.string().min(1, required).regex(PHONE_REGEX, 'Telefone inválido.');

export const profileSchema = z.object({
  personalPhone: phoneField('Informe o celular pessoal.'),
  institutionalPhone: phoneField('Informe o celular institucional.'),
  institutionalEmail: emailField('Informe o e-mail institucional.'),
  image: z.string().max(500).optional().or(z.literal('')),
  description: z.string().min(1, 'Escreva uma descrição.').max(2000),

  postalCode: z.string().min(1, 'Informe o CEP.').regex(POSTAL_CODE_REGEX, 'CEP inválido.'),
  street: z.string().min(1, 'Informe o logradouro.').max(300),
  number: z.string().min(1, 'Informe o número.').max(10),
  complement: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1, 'Informe a cidade.').max(200),
  state: z.string().min(1, 'Selecione a UF.').regex(UF_REGEX, 'UF inválida.'),
});

export type ProfileFormInput = z.infer<typeof profileSchema>;

export function mapResponseToFormValues(data: ProfileResponse): ProfileFormInput {
  return {
    personalPhone: data.user.personalPhone,
    institutionalPhone: data.institutionalPhone,
    institutionalEmail: data.institutionalEmail,
    image: data.user.image ?? '',
    description: data.description,
    postalCode: data.address.postalCode,
    street: data.address.street,
    number: data.address.number,
    complement: data.address.complement ?? '',
    city: data.address.city,
    state: data.address.state,
  };
}

import type { SignUpInput } from '@/features/auth/sign-up/sign-up-schema';
import { api } from '@/lib/api';

export interface SignUpPayload {
  name: string;
  email: string;
  personalPhone: string;
  password: string;
  companyName: string;
  tradeName?: string;
  cnpj: string;
  institutionalEmail: string;
  institutionalPhone: string;
  description: string;
  address: {
    postalCode: string;
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
  };
}

interface CreatedResource {
  id: number;
}

const orUndefined = (value: string): string | undefined =>
  value.trim() ? value.trim() : undefined;

/** Corpo achatado dos endpoints REST a partir dos valores do wizard. */
export function toSignUpPayload(v: SignUpInput): SignUpPayload {
  return {
    name: v.name,
    email: v.email,
    personalPhone: v.personalPhone,
    password: v.password,
    companyName: v.companyName,
    tradeName: orUndefined(v.tradeName),
    cnpj: v.cnpj,
    institutionalEmail: v.institutionalEmail,
    institutionalPhone: v.institutionalPhone,
    description: v.description,
    address: {
      postalCode: v.postalCode,
      street: v.street,
      number: v.number,
      complement: orUndefined(v.complement),
      city: v.city,
      state: v.state,
    },
  };
}

export const createEstablishment = (body: SignUpPayload) =>
  api.post<CreatedResource>('/establishments', body);

export const createBeneficiaryEntity = (body: SignUpPayload) =>
  api.post<CreatedResource>('/beneficiary-entities', body);

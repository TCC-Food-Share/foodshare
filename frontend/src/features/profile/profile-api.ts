import type { Role } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { toFormData } from '@/lib/form-data';

export interface ProfileResponse {
  id: number;
  companyName: string;
  tradeName: string | null;
  cnpj: string;
  institutionalEmail: string;
  institutionalPhone: string;
  description: string;
  user: {
    id: number;
    name: string;
    email: string;
    personalPhone: string;
    image: string | null;
  };
  address: {
    id: number;
    postalCode: string;
    street: string;
    number: string;
    complement: string | null;
    city: string;
    state: string;
  };
}

export interface UpdateProfilePayload {
  personalPhone: string;
  institutionalPhone: string;
  institutionalEmail: string;
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

function profilePath(role: Role): string {
  return role === 'establishment' ? '/establishments/me' : '/beneficiary-entities/me';
}

export function getMyProfile(role: Role): Promise<ProfileResponse> {
  return api.get<ProfileResponse>(profilePath(role));
}

export function updateMyProfile(
  role: Role,
  payload: UpdateProfilePayload,
  image: File | null,
): Promise<ProfileResponse> {
  return api.patch<ProfileResponse>(
    profilePath(role),
    image ? toFormData(payload, { image }) : payload,
  );
}

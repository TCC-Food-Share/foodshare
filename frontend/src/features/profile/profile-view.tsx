import { LockIcon, MapPinIcon, PencilIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Role } from '@/features/auth/auth-context';
import type { ProfileResponse } from '@/features/profile/profile-api';

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

function Field({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={`flex items-center gap-1.5 text-sm ${locked ? 'text-muted-foreground' : ''}`}
      >
        {value || '—'}
        {locked && <LockIcon className="size-3" />}
      </span>
    </div>
  );
}

export function ProfileView({
  data,
  role,
  onEdit,
}: {
  data: ProfileResponse;
  role: Role;
  onEdit: () => void;
}) {
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
          <Button variant="outline" onClick={onEdit}>
            <PencilIcon />
            Editar perfil
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados institucionais</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Razão social" value={data.companyName} locked />
            <Field label="Nome fantasia" value={data.tradeName ?? ''} locked />
            <Field label="CNPJ" value={data.cnpj} locked />
            <Field label="E-mail institucional" value={data.institutionalEmail} />
            <Field label="Celular institucional" value={data.institutionalPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato do responsável</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Nome" value={data.user.name} locked />
            <Field label="E-mail" value={data.user.email} locked />
            <Field label="Celular pessoal" value={data.user.personalPhone} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="CEP" value={data.address.postalCode} />
          <Field label="Cidade / UF" value={`${data.address.city} / ${data.address.state}`} />
          <Field label="Logradouro" value={data.address.street} />
          <Field label="Número" value={data.address.number} />
          <Field label="Complemento" value={data.address.complement ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{data.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

import { ArrowLeftIcon, MapPinIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/user-avatar';
import { INSTITUTION_KINDS, type InstitutionKind } from '@/features/institutions/institution-kind';
import type { InstitutionPublicProfile } from '@/features/institutions/institutions-api';

export function BackToList({ kind }: { kind: InstitutionKind }) {
  const copy = INSTITUTION_KINDS[kind];
  return (
    <Button variant="ghost" size="sm" className="w-fit gap-1.5 px-2" asChild>
      <Link to={copy.basePath}>
        <ArrowLeftIcon />
        {copy.title}
      </Link>
    </Button>
  );
}

export function ProfileHeader({ institution }: { institution: InstitutionPublicProfile }) {
  return (
    <section className="border-border bg-card flex flex-col gap-5 rounded-lg border p-6">
      <div className="flex items-center gap-4">
        <UserAvatar
          image={institution.image}
          name={institution.name}
          className="size-16 shrink-0 text-lg"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold break-words">{institution.name}</h1>
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPinIcon className="size-3.5 shrink-0" />
            {institution.city}, {institution.state}
          </span>
        </div>
      </div>
      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <h2 className="text-foreground text-base font-semibold">Sobre</h2>
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
          {institution.description}
        </p>
      </div>
    </section>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

interface ProfileErrorProps {
  kind: InstitutionKind;
  notFound: boolean;
  onRetry: () => void;
}

export function ProfileError({ kind, notFound, onRetry }: ProfileErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-foreground font-medium">
        {notFound
          ? 'Instituição não encontrada.'
          : 'Não foi possível carregar o perfil. Tente novamente mais tarde.'}
      </p>
      {notFound ? (
        <Button variant="outline" size="sm" asChild>
          <Link to={INSTITUTION_KINDS[kind].basePath}>
            Ver {INSTITUTION_KINDS[kind].title.toLowerCase()}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function ProfileSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

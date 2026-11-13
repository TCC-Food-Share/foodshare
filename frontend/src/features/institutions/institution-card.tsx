import { MapPinIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { UserAvatar } from '@/components/user-avatar';
import {
  type InstitutionKind,
  institutionProfilePath,
} from '@/features/institutions/institution-kind';
import type { InstitutionListItem } from '@/features/institutions/institutions-api';

export function InstitutionCard({
  kind,
  institution,
}: {
  kind: InstitutionKind;
  institution: InstitutionListItem;
}) {
  return (
    <Link
      to={institutionProfilePath(kind, institution.id)}
      className="border-border bg-card hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center gap-4 rounded-lg border p-4 shadow-xs transition-colors outline-none focus-visible:ring-[3px]"
    >
      <UserAvatar
        image={institution.image}
        name={institution.name}
        className="size-14 shrink-0 text-base"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-card-foreground truncate text-[15px] font-semibold">
          {institution.name}
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPinIcon className="size-3.5 shrink-0" />
          <span className="truncate">
            {institution.city}, {institution.state}
          </span>
        </span>
      </div>
    </Link>
  );
}

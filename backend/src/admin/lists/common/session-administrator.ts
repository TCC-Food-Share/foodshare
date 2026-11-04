import type { UserSession } from '@thallesp/nestjs-better-auth';

import type { AuditAdministrator } from '../../../audit/audit.service';

export const sessionAdministrator = (session: UserSession): AuditAdministrator => ({
  id: Number(session.user.id),
  name: session.user.name,
  email: session.user.email,
});

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';

import type { RoleName } from './roles.constants';
import { ROLES_KEY, RolesGuard } from './roles.guard';

export function RequireRoles(...roles: RoleName[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(RolesGuard),
    ApiForbiddenResponse({
      description: 'O papel do usuário autenticado não tem acesso (`code: ROLE_NOT_ALLOWED`).',
    }),
  );
}

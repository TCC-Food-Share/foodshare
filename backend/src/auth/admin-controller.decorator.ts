import { applyDecorators, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RequireRoles } from './require-roles.decorator';
import { ROLE } from './roles.constants';

export function AdminController(path: string) {
  return applyDecorators(
    Controller(`admin/${path}`),
    RequireRoles(ROLE.ADMINISTRATOR),
    ApiTags('Administração'),
  );
}

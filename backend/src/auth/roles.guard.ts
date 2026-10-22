import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLE_NOT_ALLOWED, type RoleName } from './roles.constants';
import { RolesService } from './roles.service';

export const ROLES_KEY = 'requiredRoles';

interface RequestWithUser {
  user?: { roleId?: number | string } | null;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const roleId = context.switchToHttp().getRequest<RequestWithUser>().user?.roleId;
    const roleName =
      roleId === undefined ? undefined : await this.rolesService.nameOf(Number(roleId));

    if (!roleName || !required.includes(roleName as RoleName)) {
      throw new ForbiddenException({
        code: ROLE_NOT_ALLOWED,
        message: 'Your role is not allowed to access this resource.',
      });
    }
    return true;
  }
}

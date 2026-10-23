import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';

import { AppService } from './app.service';
import { ImageStorageService } from './files/image-storage.service';
import { PrismaService } from './prisma/prisma.service';
import { GLOBAL_THROTTLER } from './rate-limit/rate-limit.constants';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
  ) {}

  @Get()
  @AllowAnonymous()
  @ApiExcludeEndpoint()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('me')
  @ApiTags('Autenticação')
  @ApiOperation({
    summary: 'Sessão atual',
    description:
      'Retorna os dados do usuário autenticado na sessão atual, junto do nome do papel ' +
      '(`role`: `Establishment`, `BeneficiaryEntity` ou `Administrator`) — o frontend usa ' +
      'isso para decidir a área (instituição ou painel administrativo).',
  })
  @ApiOkResponse({
    description: 'Usuário autenticado. `user.image` vem como URL da rota de arquivos, ou `null`.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  async getMe(@Session() session: UserSession) {
    const roleId = (session.user as { roleId?: number }).roleId;
    const role =
      roleId === undefined ? null : await this.prisma.role.findUnique({ where: { id: roleId } });
    return {
      user: { ...session.user, image: this.storage.toUrl(session.user.image) },
      role: role?.name ?? null,
    };
  }

  @Get('health')
  @AllowAnonymous()
  @SkipThrottle({ [GLOBAL_THROTTLER]: true })
  @ApiTags('Geral')
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica se a API está no ar e se a conexão com o banco de dados está saudável.',
  })
  @ApiOkResponse({ description: 'API e banco de dados operacionais.' })
  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unavailable.');
    }
    return { status: 'ok' };
  }
}

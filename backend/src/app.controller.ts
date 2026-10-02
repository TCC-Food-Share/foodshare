import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';

import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
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
      '(`role`) — o frontend usa isso para saber se é estabelecimento ou entidade beneficiária.',
  })
  @ApiOkResponse({ description: 'Usuário autenticado.' })
  async getMe(@Session() session: UserSession) {
    const roleId = (session.user as { roleId?: number }).roleId;
    const role =
      roleId === undefined ? null : await this.prisma.role.findUnique({ where: { id: roleId } });
    return { user: session.user, role: role?.name ?? null };
  }

  @Get('health')
  @AllowAnonymous()
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

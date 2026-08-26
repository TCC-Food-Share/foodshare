import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';

import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Geral')
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
  @ApiOperation({
    summary: 'Sessão atual',
    description: 'Retorna os dados do usuário autenticado na sessão atual.',
  })
  @ApiOkResponse({ description: 'Usuário autenticado.' })
  getMe(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Get('health')
  @AllowAnonymous()
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

import { Controller, Get, HttpCode, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { AllowAnonymous, AuthService, Session } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
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
    description: 'Retorna os dados do usuário autenticado na sessão atual.',
  })
  @ApiOkResponse({ description: 'Usuário autenticado.' })
  getMe(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiTags('Autenticação')
  @ApiOperation({
    summary: 'Logout',
    description: 'Encerra a sessão atual do usuário autenticado.',
  })
  @ApiOkResponse({ description: 'Sessão encerrada com sucesso.' })
  async logout(@Req() request: Request) {
    await this.authService.api.signOut({ headers: fromNodeHeaders(request.headers) });
    return { success: true };
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

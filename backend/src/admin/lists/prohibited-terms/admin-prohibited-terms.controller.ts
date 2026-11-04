import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { AdminController } from '../../../auth/admin-controller.decorator';
import { ApiAdminListWrite } from '../admin-list.docs';
import { sessionAdministrator } from '../common/session-administrator';
import { AdminProhibitedTermsService } from './admin-prohibited-terms.service';
import {
  AdminProhibitedTermDto,
  ListProhibitedTermsQueryDto,
  PaginatedAdminProhibitedTermsDto,
  SaveProhibitedTermDto,
} from './prohibited-term.dto';

@AdminController('prohibited-terms')
export class AdminProhibitedTermsController {
  constructor(private readonly service: AdminProhibitedTermsService) {}

  @Get()
  @ApiOperation({
    summary: 'Termos proibidos (painel)',
    description: 'Lista os termos com busca, ordenação e paginação (RF70).',
  })
  @ApiOkResponse({ type: PaginatedAdminProhibitedTermsDto })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(@Query() query: ListProhibitedTermsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastro de termo proibido',
    description: 'RF67: gravado em minúsculas e sem acentos. Auditado.',
  })
  @ApiCreatedResponse({ type: AdminProhibitedTermDto })
  @ApiAdminListWrite('Termo já cadastrado (`code: DUPLICATE_NAME`).')
  create(@Session() session: UserSession, @Body() dto: SaveProhibitedTermDto) {
    return this.service.create(sessionAdministrator(session), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edição de termo proibido', description: 'RF68. Auditado.' })
  @ApiOkResponse({ type: AdminProhibitedTermDto })
  @ApiAdminListWrite('Termo já cadastrado (`code: DUPLICATE_NAME`).')
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveProhibitedTermDto,
  ) {
    return this.service.update(sessionAdministrator(session), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclusão de termo proibido',
    description: 'RF69. Auditada.',
  })
  @ApiNoContentResponse({ description: 'Termo excluído.' })
  @ApiAdminListWrite('Não ocorre: termos não têm vínculo.')
  async remove(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(sessionAdministrator(session), id);
  }
}

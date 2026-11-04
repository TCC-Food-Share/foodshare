import { Body, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { AdminController } from '../../auth/admin-controller.decorator';
import { ApiAdminListWrite } from '../lists/admin-list.docs';
import { sessionAdministrator } from '../lists/common/session-administrator';
import { AdminSuggestionsService } from './admin-suggestions.service';
import {
  AdminSuggestionDto,
  ApproveSuggestionDto,
  ListSuggestionsQueryDto,
  PaginatedAdminSuggestionsDto,
} from './suggestion.dto';

@AdminController('suggestions')
export class AdminSuggestionsController {
  constructor(private readonly service: AdminSuggestionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Sugestões (painel)',
    description: 'Lista as sugestões, com filtro por tipo e status, busca e ordenação (RF49).',
  })
  @ApiOkResponse({ type: PaginatedAdminSuggestionsDto })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(@Query() query: ListSuggestionsQueryDto) {
    return this.service.list(query);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Aprovação de sugestão',
    description:
      'Cadastra a opção na lista do tipo da sugestão, na mesma transação (RF49). Item do ' +
      'catálogo exige `categoryId`; unidade de medida exige `abbreviation` e `allowsFraction`. ' +
      'Auditada.',
  })
  @ApiOkResponse({ type: AdminSuggestionDto })
  @ApiAdminListWrite(
    'Sugestão já decidida (`code: SUGGESTION_ALREADY_REVIEWED`), nome ou sigla já cadastrados ' +
      '(`code: DUPLICATE_NAME`, `DUPLICATE_ABBREVIATION`).',
  )
  approve(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveSuggestionDto,
  ) {
    return this.service.approve(sessionAdministrator(session), id, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Recusa de sugestão',
    description: 'Registra a sugestão como recusada, sem criar opção (RF49). Auditada.',
  })
  @ApiOkResponse({ type: AdminSuggestionDto })
  @ApiAdminListWrite('Sugestão já decidida (`code: SUGGESTION_ALREADY_REVIEWED`).')
  reject(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number) {
    return this.service.reject(sessionAdministrator(session), id);
  }
}

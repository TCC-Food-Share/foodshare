import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { RequireRoles } from '../auth/require-roles.decorator';
import { INSTITUTION_ROLES } from '../auth/roles.constants';
import { CreateSuggestionDto, SuggestionResponseDto } from './suggestion.dto';
import { SuggestionsService } from './suggestions.service';

@ApiTags('Listas padronizadas')
@RequireRoles(...INSTITUTION_ROLES)
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Sugestão de nova opção',
    description:
      'Envia uma sugestão para uma lista padronizada, que fica pendente até o administrador ' +
      'decidir (RF71).',
  })
  @ApiCreatedResponse({ type: SuggestionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos, ou termo proibido ou link no texto (`code: PROHIBITED_CONTENT`, com ' +
      '`fields`).',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiConflictResponse({
    description:
      'Opção já existe na lista (`code: SUGGESTION_OPTION_EXISTS`) ou já foi sugerida e está ' +
      'pendente (`code: SUGGESTION_ALREADY_PENDING`).',
  })
  create(
    @Session() session: UserSession,
    @Body() dto: CreateSuggestionDto,
  ): Promise<SuggestionResponseDto> {
    return this.suggestionsService.create(Number(session.user.id), dto);
  }
}

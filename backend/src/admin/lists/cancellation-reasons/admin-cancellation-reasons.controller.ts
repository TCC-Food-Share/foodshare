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
import { AdminCancellationReasonsService } from './admin-cancellation-reasons.service';
import {
  AdminCancellationReasonDto,
  ListCancellationReasonsQueryDto,
  PaginatedAdminCancellationReasonsDto,
  SaveCancellationReasonDto,
} from './cancellation-reason.dto';

@AdminController('cancellation-reasons')
export class AdminCancellationReasonsController {
  constructor(private readonly service: AdminCancellationReasonsService) {}

  @Get()
  @ApiOperation({
    summary: 'Motivos de cancelamento (painel)',
    description:
      'Lista todos os motivos, inclusive os de sistema (marcados), com busca, ordenação e paginação (RF40).',
  })
  @ApiOkResponse({ type: PaginatedAdminCancellationReasonsDto })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(@Query() query: ListCancellationReasonsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastro de motivo de cancelamento',
    description: 'RF37: o motivo nasce comum. Auditado.',
  })
  @ApiCreatedResponse({ type: AdminCancellationReasonDto })
  @ApiAdminListWrite('Nome já cadastrado (`code: DUPLICATE_NAME`).')
  create(@Session() session: UserSession, @Body() dto: SaveCancellationReasonDto) {
    return this.service.create(sessionAdministrator(session), dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edição de motivo de cancelamento',
    description: 'RF38: motivos de sistema não podem ser editados. Auditado.',
  })
  @ApiOkResponse({ type: AdminCancellationReasonDto })
  @ApiAdminListWrite(
    'Nome já cadastrado (`code: DUPLICATE_NAME`) ou motivo de sistema (`code: SYSTEM_REASON_PROTECTED`).',
  )
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveCancellationReasonDto,
  ) {
    return this.service.update(sessionAdministrator(session), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclusão de motivo de cancelamento',
    description: 'RF39: bloqueada para motivos de sistema e motivos usados em pedidos. Auditada.',
  })
  @ApiNoContentResponse({ description: 'Motivo excluído.' })
  @ApiAdminListWrite(
    'Motivo de sistema (`code: SYSTEM_REASON_PROTECTED`) ou usado em pedidos (`code: OPTION_IN_USE`).',
  )
  async remove(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(sessionAdministrator(session), id);
  }
}

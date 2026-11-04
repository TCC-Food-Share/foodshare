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
import { AdminMeasurementUnitsService } from './admin-measurement-units.service';
import {
  AdminMeasurementUnitDto,
  ListMeasurementUnitsQueryDto,
  PaginatedAdminMeasurementUnitsDto,
  SaveMeasurementUnitDto,
} from './measurement-unit.dto';

@AdminController('measurement-units')
export class AdminMeasurementUnitsController {
  constructor(private readonly service: AdminMeasurementUnitsService) {}

  @Get()
  @ApiOperation({
    summary: 'Unidades de medida (painel)',
    description: 'Lista as unidades com busca por id, nome e sigla, ordenação e paginação (RF62).',
  })
  @ApiOkResponse({ type: PaginatedAdminMeasurementUnitsDto })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(@Query() query: ListMeasurementUnitsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastro de unidade de medida', description: 'RF59. Auditado.' })
  @ApiCreatedResponse({ type: AdminMeasurementUnitDto })
  @ApiAdminListWrite(
    'Nome ou sigla já cadastrados (`code: DUPLICATE_NAME`, `DUPLICATE_ABBREVIATION`).',
  )
  create(@Session() session: UserSession, @Body() dto: SaveMeasurementUnitDto) {
    return this.service.create(sessionAdministrator(session), dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edição de unidade de medida',
    description:
      'RF60: desmarcar a fração é bloqueado se houver alimento fracionado na unidade. Auditado.',
  })
  @ApiOkResponse({ type: AdminMeasurementUnitDto })
  @ApiAdminListWrite(
    'Nome ou sigla já cadastrados (`code: DUPLICATE_NAME`, `DUPLICATE_ABBREVIATION`) ou alimento fracionado na unidade (`code: FRACTION_IN_USE`).',
  )
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveMeasurementUnitDto,
  ) {
    return this.service.update(sessionAdministrator(session), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclusão de unidade de medida',
    description: 'RF61: bloqueada se houver alimentos com a unidade. Auditada.',
  })
  @ApiNoContentResponse({ description: 'Unidade excluída.' })
  @ApiAdminListWrite('Unidade usada por alimentos (`code: OPTION_IN_USE`).')
  async remove(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(sessionAdministrator(session), id);
  }
}

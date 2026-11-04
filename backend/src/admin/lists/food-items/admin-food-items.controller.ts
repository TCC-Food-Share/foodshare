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
import { AdminFoodItemsService } from './admin-food-items.service';
import {
  AdminFoodItemDto,
  ListFoodItemsQueryDto,
  PaginatedAdminFoodItemsDto,
  SaveFoodItemDto,
} from './food-item.dto';

@AdminController('food-items')
export class AdminFoodItemsController {
  constructor(private readonly service: AdminFoodItemsService) {}

  @Get()
  @ApiOperation({
    summary: 'Catálogo de alimentos (painel)',
    description:
      'Lista os itens do catálogo com busca por id, nome e categoria, ordenação e paginação (RF66).',
  })
  @ApiOkResponse({ type: PaginatedAdminFoodItemsDto })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(@Query() query: ListFoodItemsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastro de item do catálogo', description: 'RF63. Auditado.' })
  @ApiCreatedResponse({ type: AdminFoodItemDto })
  @ApiAdminListWrite('Nome já cadastrado (`code: DUPLICATE_NAME`).')
  create(@Session() session: UserSession, @Body() dto: SaveFoodItemDto) {
    return this.service.create(sessionAdministrator(session), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edição de item do catálogo', description: 'RF64. Auditado.' })
  @ApiOkResponse({ type: AdminFoodItemDto })
  @ApiAdminListWrite('Nome já cadastrado (`code: DUPLICATE_NAME`).')
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveFoodItemDto,
  ) {
    return this.service.update(sessionAdministrator(session), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclusão de item do catálogo',
    description: 'RF65: bloqueada se houver alimentos com o item. Auditada.',
  })
  @ApiNoContentResponse({ description: 'Item excluído.' })
  @ApiAdminListWrite('Item usado por alimentos (`code: OPTION_IN_USE`).')
  async remove(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(sessionAdministrator(session), id);
  }
}

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
import { AdminCategoriesService } from './admin-categories.service';
import {
  AdminCategoryDto,
  ListCategoriesQueryDto,
  PaginatedAdminCategoriesDto,
  SaveCategoryDto,
} from './category.dto';

@AdminController('categories')
export class AdminCategoriesController {
  constructor(private readonly service: AdminCategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Categorias (painel)',
    description: 'Lista as categorias com busca, ordenação e paginação (RF36).',
  })
  @ApiOkResponse({ type: PaginatedAdminCategoriesDto })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(@Query() query: ListCategoriesQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastro de categoria', description: 'RF33. Auditado.' })
  @ApiCreatedResponse({ type: AdminCategoryDto })
  @ApiAdminListWrite('Nome já cadastrado (`code: DUPLICATE_NAME`).')
  create(@Session() session: UserSession, @Body() dto: SaveCategoryDto) {
    return this.service.create(sessionAdministrator(session), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edição de categoria', description: 'RF34. Auditado.' })
  @ApiOkResponse({ type: AdminCategoryDto })
  @ApiAdminListWrite('Nome já cadastrado (`code: DUPLICATE_NAME`).')
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveCategoryDto,
  ) {
    return this.service.update(sessionAdministrator(session), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclusão de categoria',
    description: 'RF35: bloqueada se houver itens do catálogo na categoria. Auditada.',
  })
  @ApiNoContentResponse({ description: 'Categoria excluída.' })
  @ApiAdminListWrite('Categoria com itens do catálogo (`code: OPTION_IN_USE`).')
  async remove(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(sessionAdministrator(session), id);
  }
}

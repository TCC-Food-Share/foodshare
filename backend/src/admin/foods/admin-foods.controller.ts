import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { AdminController } from '../../auth/admin-controller.decorator';
import { ImageFilePipe, type ValidatedImage } from '../../files/image-file.pipe';
import { ImageUpload } from '../../files/image-upload.decorator';
import { sessionAdministrator } from '../lists/common/session-administrator';
import {
  AdminFoodDetailDto,
  AdminFoodEditImpactDto,
  AdminFoodEditImpactQueryDto,
  AdminUpdateFoodDto,
  ListAdminFoodsQueryDto,
  PaginatedAdminFoodsDto,
} from './admin-food.dto';
import { AdminFoodsService } from './admin-foods.service';

const UNAUTHORIZED = 'Requisição sem sessão autenticada válida.';
const NOT_FOUND = 'Nenhum alimento com esse identificador.';

@AdminController('foods')
export class AdminFoodsController {
  constructor(private readonly service: AdminFoodsService) {}

  @Get()
  @ApiOperation({
    summary: 'Alimentos (painel)',
    description:
      'RF52, DT60: todos os alimentos, em qualquer status, inclusive os excluídos logicamente. ' +
      '`search` casa sem acento o nome, a categoria, a razão social e o nome fantasia do ' +
      'estabelecimento e as datas de vencimento e de publicação em dd/mm/aaaa. Sem `sort`, a ' +
      'ordem é a data de publicação mais recente primeiro.',
  })
  @ApiOkResponse({ type: PaginatedAdminFoodsDto })
  @ApiBadRequestResponse({ description: 'Parâmetros de busca inválidos.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  list(@Query() query: ListAdminFoodsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id/edit-impact')
  @ApiOperation({
    summary: 'Prévia dos efeitos da edição pelo painel',
    description:
      'DT58, RN20: para os valores pretendidos (os omitidos valem como os atuais), quantos pedidos ' +
      'pendentes terão a quantidade atualizada e quantos serão rejeitados. Não altera nada.',
  })
  @ApiOkResponse({ type: AdminFoodEditImpactDto })
  @ApiBadRequestResponse({ description: 'Parâmetros inválidos.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  editImpact(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: AdminFoodEditImpactQueryDto,
  ): Promise<AdminFoodEditImpactDto> {
    return this.service.editImpact(id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe do alimento (painel)',
    description:
      'RF53: qualquer alimento, em qualquer status, excluído ou não, com o campo deletado do ' +
      'estabelecimento e a contagem de pedidos por status.',
  })
  @ApiOkResponse({ type: AdminFoodDetailDto })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  get(@Param('id', ParseIntPipe) id: number): Promise<AdminFoodDetailDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edição de alimento pelo painel',
    description:
      'RF50, DT57, DT58: só os campos enviados. Vale para alimento `Ativo`, não excluído e sem ' +
      'pedido `Em andamento`. Trocar item do catálogo ou unidade rejeita os pedidos pendentes; ' +
      'trocar o tipo rejeita os incompatíveis; trocar a quantidade aplica a RN20. Tudo numa ' +
      'transação. Auditado.',
  })
  @ImageUpload({ body: AdminUpdateFoodDto, required: false })
  @ApiOkResponse({ type: AdminFoodDetailDto })
  @ApiBadRequestResponse({
    description:
      'Nenhum campo enviado, dados inválidos, termo proibido (`PROHIBITED_CONTENT`), imagem ' +
      'recusada, item ou unidade inexistente (`INVALID_CATALOG_ITEM`, `INVALID_MEASUREMENT_UNIT`), ' +
      'quantidade incompatível (`FRACTION_NOT_ALLOWED`, `PARTIAL_ONLY_QUANTITY_TOO_LOW`), ' +
      'vencimento passado (`EXPIRATION_DATE_IN_PAST`) ou publicação futura (`PUBLISHED_AT_IN_FUTURE`).',
  })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({
    description:
      'Alimento excluído (`FOOD_DELETED`), não `Ativo` (`FOOD_NOT_ACTIVE`) ou com pedido em ' +
      'andamento (`FOOD_HAS_ORDERS_IN_PROGRESS`).',
  })
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateFoodDto,
    @UploadedFile(new ImageFilePipe({ required: false })) image: ValidatedImage | undefined,
  ): Promise<AdminFoodDetailDto> {
    return this.service.update(sessionAdministrator(session), id, dto, image);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclusão permanente de alimento pelo painel',
    description:
      'RF51, DT59: apaga de vez o alimento e todos os pedidos dele, em qualquer status, numa ' +
      'transação, e a imagem depois do commit. Pedido apagado não devolve estoque. Auditado.',
  })
  @ApiNoContentResponse({ description: 'Alimento apagado.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  remove(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(sessionAdministrator(session), id);
  }
}

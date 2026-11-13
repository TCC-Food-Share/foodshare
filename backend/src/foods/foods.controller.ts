import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { RequireRoles } from '../auth/require-roles.decorator';
import { INSTITUTION_ROLES, ROLE } from '../auth/roles.constants';
import { ImageFilePipe, type ValidatedImage } from '../files/image-file.pipe';
import { ImageUpload } from '../files/image-upload.decorator';
import { CreateFoodDto } from './dto/create-food.dto';
import { DeleteFoodQueryDto } from './dto/delete-food-query.dto';
import { FoodResponseDto } from './dto/food-response.dto';
import { ListFoodsQueryDto } from './dto/list-foods-query.dto';
import { ListMyFoodsQueryDto } from './dto/list-my-foods-query.dto';
import {
  MyFoodResponseDto,
  PaginatedMyFoodsResponseDto,
  QuantityImpactResponseDto,
} from './dto/my-food-response.dto';
import { PaginatedFoodsResponseDto } from './dto/paginated-foods-response.dto';
import { QuantityImpactQueryDto, ReactivateFoodDto, UpdateFoodDto } from './dto/update-food.dto';
import { FoodsService } from './foods.service';

@ApiTags('Alimentos')
@RequireRoles(...INSTITUTION_ROLES)
@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastro de alimento',
    description:
      'Cadastra um alimento do estabelecimento autenticado (RF14): item do catálogo (que ' +
      'define nome e categoria), quantidade, unidade de medida, tipo de solicitação, ' +
      'descrição, data de vencimento, observações opcionais e a imagem obrigatória no mesmo ' +
      'formulário. O alimento nasce "Ativo" e aparece na hora no feed.',
  })
  @ImageUpload({ body: CreateFoodDto, required: true })
  @ApiCreatedResponse({ description: 'Alimento cadastrado com sucesso.', type: FoodResponseDto })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos, termo proibido ou link em texto livre (`code: PROHIBITED_CONTENT`, ' +
      'com `fields`), item do catálogo ou unidade inexistentes (`code: INVALID_CATALOG_ITEM`, ' +
      '`INVALID_MEASUREMENT_UNIT`), quantidade fracionada em unidade sem fração ' +
      '(`FRACTION_NOT_ALLOWED`), "Somente parcial" sem pedido parcial possível ' +
      '(`PARTIAL_ONLY_QUANTITY_TOO_LOW`) ou imagem ausente ou recusada (`IMAGE_REQUIRED`, ' +
      '`IMAGE_TOO_LARGE`, `IMAGE_INVALID_TYPE`).',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'Nenhum estabelecimento vinculado ao usuário autenticado.' })
  create(
    @Session() session: UserSession,
    @Body() dto: CreateFoodDto,
    @UploadedFile(new ImageFilePipe({ required: true })) image: ValidatedImage,
  ): Promise<FoodResponseDto> {
    return this.foodsService.create(Number(session.user.id), dto, image);
  }

  @Get()
  @ApiOperation({
    summary: 'Listagem e busca de alimentos',
    description:
      'Lista, de forma paginada, os alimentos disponíveis na plataforma — status "Ativo", ' +
      'não excluídos e não vencidos — cadastrados por qualquer estabelecimento (RF20). ' +
      'Aceita filtros opcionais de busca: `name` e `city` casam por trecho ignorando ' +
      'caixa e acento, `categoryId` filtra pela categoria, `state` pela UF do estabelecimento ' +
      'de origem e `establishmentId` pelo estabelecimento (perfil público, RF13); filtros ' +
      'informados combinam por E. Requer usuário autenticado.',
  })
  @ApiOkResponse({
    description: 'Página de alimentos disponíveis.',
    type: PaginatedFoodsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Parâmetro de busca ou de paginação inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(@Query() query: ListFoodsQueryDto): Promise<PaginatedFoodsResponseDto> {
    return this.foodsService.list(query);
  }

  @Get('mine')
  @RequireRoles(ROLE.ESTABLISHMENT)
  @ApiOperation({
    summary: 'Meus alimentos',
    description:
      'Lista, de forma paginada, os alimentos não excluídos do estabelecimento autenticado, em ' +
      'qualquer status e mesmo vencidos, com a contagem de pedidos "Pendente" e "Em andamento" ' +
      '(RF19). Aceita filtro por status, busca e ordenação por campo.',
  })
  @ApiOkResponse({ description: 'Página de alimentos.', type: PaginatedMyFoodsResponseDto })
  @ApiBadRequestResponse({ description: 'Parâmetro de busca, ordenação ou paginação inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  listMine(
    @Session() session: UserSession,
    @Query() query: ListMyFoodsQueryDto,
  ): Promise<PaginatedMyFoodsResponseDto> {
    return this.foodsService.listMine(Number(session.user.id), query);
  }

  @Get('mine/:id/quantity-impact')
  @RequireRoles(ROLE.ESTABLISHMENT)
  @ApiOperation({
    summary: 'Prévia do efeito de uma nova quantidade',
    description:
      'Informa quantos pedidos "Pendente" totais seriam atualizados e quantos parciais seriam ' +
      'rejeitados com a quantidade informada, sem alterar nada (RN20).',
  })
  @ApiOkResponse({ description: 'Pedidos afetados.', type: QuantityImpactResponseDto })
  @ApiBadRequestResponse({ description: 'Quantidade ou id inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'O estabelecimento não tem alimento com o id informado.' })
  quantityImpact(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QuantityImpactQueryDto,
  ): Promise<QuantityImpactResponseDto> {
    return this.foodsService.quantityImpact(Number(session.user.id), id, query.quantity);
  }

  @Patch(':id')
  @RequireRoles(ROLE.ESTABLISHMENT)
  @ApiOperation({
    summary: 'Edição de validade e quantidade',
    description:
      'Altera a data de vencimento e/ou a quantidade de um alimento "Ativo" sem pedido ' +
      '"Em andamento" (RF15). Ao mudar a quantidade, os pedidos "Pendente" totais acompanham o ' +
      'estoque e os parciais que não cabem mais são rejeitados (RN20).',
  })
  @ApiOkResponse({ description: 'Alimento atualizado.', type: MyFoodResponseDto })
  @ApiBadRequestResponse({
    description:
      'Nenhum campo informado, dado inválido, data no passado (`code: EXPIRATION_DATE_IN_PAST`) ' +
      'ou quantidade recusada (`FRACTION_NOT_ALLOWED`, `PARTIAL_ONLY_QUANTITY_TOO_LOW`).',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'O estabelecimento não tem alimento com o id informado.' })
  @ApiConflictResponse({
    description:
      'Alimento fora do status "Ativo" (`code: FOOD_NOT_ACTIVE`) ou com pedido "Em andamento" ' +
      '(`FOOD_HAS_ORDERS_IN_PROGRESS`).',
  })
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFoodDto,
  ): Promise<MyFoodResponseDto> {
    return this.foodsService.update(Number(session.user.id), id, dto);
  }

  @Patch(':id/deactivate')
  @RequireRoles(ROLE.ESTABLISHMENT)
  @ApiOperation({
    summary: 'Desativação de alimento',
    description:
      'Muda um alimento "Ativo" sem pedido "Em andamento" para "Inativo" e rejeita os pedidos ' +
      '"Pendente" dele (RF18, RN21).',
  })
  @ApiOkResponse({ description: 'Alimento desativado.', type: MyFoodResponseDto })
  @ApiBadRequestResponse({ description: 'Id em formato inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'O estabelecimento não tem alimento com o id informado.' })
  @ApiConflictResponse({
    description:
      'Alimento fora do status "Ativo" (`code: FOOD_NOT_ACTIVE`) ou com pedido "Em andamento" ' +
      '(`FOOD_HAS_ORDERS_IN_PROGRESS`).',
  })
  deactivate(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MyFoodResponseDto> {
    return this.foodsService.deactivate(Number(session.user.id), id);
  }

  @Patch(':id/reactivate')
  @RequireRoles(ROLE.ESTABLISHMENT)
  @ApiOperation({
    summary: 'Reativação de alimento',
    description:
      'Volta um alimento "Inativo" para "Ativo", com nova data de vencimento e nova quantidade ' +
      '(RF17, RN22). A data de publicação não muda.',
  })
  @ApiOkResponse({ description: 'Alimento reativado.', type: MyFoodResponseDto })
  @ApiBadRequestResponse({
    description:
      'Dado inválido, data no passado (`code: EXPIRATION_DATE_IN_PAST`) ou quantidade recusada ' +
      '(`FRACTION_NOT_ALLOWED`, `PARTIAL_ONLY_QUANTITY_TOO_LOW`).',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'O estabelecimento não tem alimento com o id informado.' })
  @ApiConflictResponse({ description: 'Alimento fora do status "Inativo" (`FOOD_NOT_INACTIVE`).' })
  reactivate(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactivateFoodDto,
  ): Promise<MyFoodResponseDto> {
    return this.foodsService.reactivate(Number(session.user.id), id, dto);
  }

  @Delete(':id')
  @RequireRoles(ROLE.ESTABLISHMENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclusão lógica de alimento',
    description:
      'Exclui logicamente o alimento: os pedidos "Pendente" são rejeitados e os "Em andamento" ' +
      'são cancelados com o motivo informado (RF16, RN23). Quantidade e status não mudam.',
  })
  @ApiNoContentResponse({ description: 'Alimento excluído.' })
  @ApiBadRequestResponse({
    description:
      'Motivo ausente com pedido "Em andamento" (`code: CANCELLATION_REASON_REQUIRED`), ou motivo ' +
      'inexistente ou de sistema (`INVALID_CANCELLATION_REASON`).',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'O estabelecimento não tem alimento com o id informado.' })
  remove(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteFoodQueryDto,
  ): Promise<void> {
    return this.foodsService.remove(Number(session.user.id), id, query.cancellationReasonId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de um alimento',
    description:
      'Retorna os dados completos de um alimento disponível — status "Ativo", não excluído ' +
      'e não vencido — identificado por id (RF21). O estabelecimento dono também vê o próprio ' +
      'alimento não excluído em qualquer status. Fora disso, responde 404. Requer usuário ' +
      'autenticado.',
  })
  @ApiOkResponse({ description: 'Dados completos do alimento.', type: FoodResponseDto })
  @ApiBadRequestResponse({ description: 'Id em formato inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'Nenhum alimento disponível com o id informado.' })
  getById(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FoodResponseDto> {
    return this.foodsService.getById(Number(session.user.id), id);
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { RequireRoles } from '../auth/require-roles.decorator';
import { INSTITUTION_ROLES } from '../auth/roles.constants';
import { AcceptImpactResponseDto } from './dto/accept-impact-response.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderDetailResponseDto } from './dto/order-detail-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import { OrdersService } from './orders.service';

const ACCEPT_CONFLICT_DESCRIPTION =
  'Aceite recusado. O corpo traz o campo `code`: `ORDER_NOT_PENDING` (o pedido não está ' +
  '"Pendente"), `FOOD_NOT_AVAILABLE` (alimento vencido, excluído, não "Ativo" ou sem ' +
  'quantidade) ou `INSUFFICIENT_FOOD_QUANTITY` (estoque menor que a quantidade do pedido).';

@ApiTags('Pedidos')
@RequireRoles(...INSTITUTION_ROLES)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Solicitação de pedido de doação',
    description:
      'Cria um pedido de doação da entidade beneficiária autenticada para um alimento ' +
      'disponível, informando o alimento e a quantidade desejada (RF22). O pedido inicia ' +
      'com status "Pendente"; os vínculos com a entidade e com o estabelecimento são ' +
      'resolvidos pela sessão e pelo alimento. Exclusivo de entidade beneficiária. ' +
      'A entidade é impedida de criar um novo pedido enquanto tiver 10 ou mais pedidos ' +
      'em aberto ("Pendente" ou "Em andamento") e enquanto já tiver um pedido em aberto ' +
      'para o mesmo alimento.',
  })
  @ApiCreatedResponse({ description: 'Pedido criado com sucesso.', type: OrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos, ou quantidade recusada pelo alimento. Neste caso o corpo traz o campo ' +
      '`code`: `QUANTITY_EXCEEDS_AVAILABLE` (acima do estoque), `FRACTION_NOT_ALLOWED` ' +
      '(fração em unidade que não aceita), `TOTAL_QUANTITY_REQUIRED` (alimento "Somente ' +
      'total" pedido em parte) ou `PARTIAL_QUANTITY_REQUIRED` (alimento "Somente parcial" ' +
      'pedido inteiro enquanto um pedido parcial ainda é possível).',
  })
  @ApiNotFoundResponse({
    description: 'Nenhuma entidade beneficiária vinculada ao usuário, ou alimento indisponível.',
  })
  @ApiConflictResponse({
    description:
      'Pedido recusado por conflito com o estado da entidade beneficiária. O corpo traz o ' +
      'campo `code` com o motivo: `ORDERS_IN_PROGRESS_LIMIT_REACHED` quando a entidade já ' +
      'possui 10 ou mais pedidos em aberto ("Pendente" ou "Em andamento") e não pode criar ' +
      'um novo até encerrar algum deles (RF22); `DUPLICATE_ORDER_IN_PROGRESS` quando a ' +
      'entidade já possui um pedido em aberto para o mesmo alimento — depois de ' +
      '"Rejeitado", "Doado" ou "Cancelado" ela pode pedir o alimento de novo.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  create(@Session() session: UserSession, @Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(Number(session.user.id), dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listagem dos próprios pedidos',
    description:
      'Lista, de forma paginada, os pedidos do solicitante — resolvido pela sessão: um ' +
      'estabelecimento vê os pedidos feitos aos alimentos dele, uma entidade beneficiária vê ' +
      'os pedidos que criou (RF27). Filtro opcional `status` (`Pendente` | `Em andamento` | ' +
      '`Rejeitado` | `Doado` | `Cancelado`) para separar por status; ausente traz todos. ' +
      'Busca opcional `search` (até 100 caracteres) por trecho do nome do alimento, do nome do ' +
      'estabelecimento (razão social ou nome fantasia) ou da data do pedido em dd/mm/aaaa ' +
      '(fuso de Brasília), sem diferenciar maiúsculas nem acentos; combina com `status`. ' +
      'Filtro opcional `beneficiaryEntityId`, aplicado junto do recorte da sessão: o ' +
      'estabelecimento vê só os pedidos dele com aquela entidade (RF12). ' +
      'Paginação por ' +
      '`page` (default 1) e `pageSize` (10, 20, 50 ou 100; default 10). Ordenado do pedido mais ' +
      'recente para o mais antigo.',
  })
  @ApiOkResponse({
    description: 'Página de pedidos do solicitante.',
    type: PaginatedOrdersResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Parâmetro `status`, `search` (mais de 100 caracteres), `page` ou `pageSize` inválido.',
  })
  @ApiNotFoundResponse({
    description: 'Nenhum estabelecimento nem entidade beneficiária vinculada ao usuário.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(
    @Session() session: UserSession,
    @Query() query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.list(Number(session.user.id), query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de um pedido',
    description:
      'Retorna os detalhes completos de um pedido do qual o solicitante é parte — o ' +
      'estabelecimento de origem do alimento ou a entidade beneficiária que criou o pedido ' +
      '(RF28). Inclui o alimento por completo (mantido como registro histórico mesmo se ' +
      'depois ficou indisponível) e a identificação e cidade/UF das duas instituições. ' +
      'Somente enquanto o pedido está "Em andamento", a instituição da outra parte traz também ' +
      'e-mail institucional, celular institucional e endereço completo (RN12); nos demais ' +
      'status, e na própria instituição, esses campos vêm null. O detalhe segue acessível às ' +
      'partes mesmo após a exclusão lógica de qualquer instituição. Traz `quantityUpdatedAt` ' +
      '(data do último ajuste da quantidade pelo estabelecimento, ou null). Pedido inexistente, ' +
      'excluído, ou em que o solicitante não é parte responde 404.',
  })
  @ApiOkResponse({ description: 'Detalhes completos do pedido.', type: OrderDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Id em formato inválido.' })
  @ApiNotFoundResponse({
    description: 'Pedido inexistente, excluído, ou solicitante não é parte / não tem instituição.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  getById(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderDetailResponseDto> {
    return this.ordersService.getById(Number(session.user.id), id);
  }

  @Get(':id/accept-impact')
  @ApiOperation({
    summary: 'Prévia do efeito do aceite',
    description:
      'Informa, sem alterar nada, o que o aceite do pedido "Pendente" faria naquele momento: ' +
      'quantos outros pedidos "Pendente" do alimento seriam rejeitados, quantos pedidos ' +
      'totais passariam a pedir o novo estoque e se o alimento passaria a "Reservado". ' +
      'Aplica as mesmas recusas do aceite. Exclusivo do estabelecimento dono do pedido.',
  })
  @ApiOkResponse({ description: 'Efeito do aceite.', type: AcceptImpactResponseDto })
  @ApiNotFoundResponse({
    description:
      'Nenhum estabelecimento vinculado ao usuário, ou pedido inexistente / de outro estabelecimento.',
  })
  @ApiConflictResponse({ description: ACCEPT_CONFLICT_DESCRIPTION })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  acceptImpact(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AcceptImpactResponseDto> {
    return this.ordersService.acceptImpact(Number(session.user.id), id);
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Aceite de pedido de doação',
    description:
      'O estabelecimento autenticado aceita um pedido "Pendente" que recebeu, reservando a ' +
      'quantidade do alimento vinculado — a quantidade aceita é subtraída do estoque do ' +
      'alimento e o pedido passa para "Em andamento" (RF23). Se o estoque zerar, o alimento ' +
      'passa a "Reservado" e todos os outros pedidos "Pendente" dele são rejeitados; se ' +
      'sobrar estoque, os pedidos totais "Pendente" passam a pedir o novo estoque e os ' +
      'parciais que não cabem são rejeitados (RN07). O pedido é resolvido pela sessão; ' +
      'exclusivo do estabelecimento dono do pedido.',
  })
  @ApiOkResponse({ description: 'Pedido aceito com sucesso.', type: OrderResponseDto })
  @ApiNotFoundResponse({
    description:
      'Nenhum estabelecimento vinculado ao usuário, ou pedido inexistente / de outro estabelecimento.',
  })
  @ApiConflictResponse({ description: ACCEPT_CONFLICT_DESCRIPTION })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  accept(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.ordersService.accept(Number(session.user.id), id);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Rejeição de pedido de doação',
    description:
      'O estabelecimento autenticado rejeita um pedido "Pendente" que recebeu — o pedido ' +
      'passa para o status terminal "Rejeitado" e o estoque do alimento não é alterado ' +
      '(pedido "Pendente" nunca reservou quantidade) (RF24). O pedido é resolvido pela ' +
      'sessão; exclusivo do estabelecimento dono do pedido. Não há motivo de rejeição.',
  })
  @ApiOkResponse({ description: 'Pedido rejeitado com sucesso.', type: OrderResponseDto })
  @ApiNotFoundResponse({
    description:
      'Nenhum estabelecimento vinculado ao usuário, ou pedido inexistente / de outro estabelecimento.',
  })
  @ApiConflictResponse({
    description:
      'Pedido não está "Pendente" (já "Em andamento", "Rejeitado", "Doado" ou "Cancelado"). ' +
      'O corpo traz `code: ORDER_NOT_PENDING`.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  reject(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.ordersService.reject(Number(session.user.id), id);
  }

  @Patch(':id/receive')
  @ApiOperation({
    summary: 'Confirmação de recebimento de pedido',
    description:
      'A entidade beneficiária autenticada confirma que recebeu o alimento de um pedido ' +
      '"Em andamento" que é dela — o pedido passa para o status terminal "Doado", ' +
      'encerrando-o (RF25). O estoque do alimento não muda: a quantidade já foi reservada no ' +
      'aceite. Se o estoque é zero e não resta outro pedido "Em andamento" do alimento, ele ' +
      'passa a "Inativo" e os pedidos "Pendente" restantes são rejeitados (RN08). O pedido é ' +
      'resolvido pela sessão; exclusivo da entidade beneficiária dona do pedido.',
  })
  @ApiOkResponse({
    description: 'Recebimento confirmado; pedido encerrado.',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'Nenhuma entidade beneficiária vinculada ao usuário, ou pedido inexistente / de outra entidade.',
  })
  @ApiConflictResponse({
    description:
      'Pedido não está "Em andamento" (ainda "Pendente", ou já "Rejeitado", "Doado" ou ' +
      '"Cancelado"). O corpo traz `code: ORDER_NOT_IN_PROGRESS`.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  receive(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.ordersService.receive(Number(session.user.id), id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelamento de pedido',
    description:
      'O estabelecimento de origem ou a entidade beneficiária cancela um pedido "Pendente" ou ' +
      '"Em andamento" do qual é parte, informando um motivo da lista (RF26, RN09). O pedido ' +
      'passa ao status terminal "Cancelado" e guarda o motivo e quem cancelou (DT33). Se o ' +
      'pedido estava "Em andamento", a quantidade volta ao estoque do alimento, o alimento ' +
      '"Reservado" volta a "Ativo" e os pedidos totais "Pendente" dele passam a pedir o novo ' +
      'estoque (DT32). Cancelar um pedido "Pendente" não muda o estoque. O pedido e a parte ' +
      'são resolvidos pela sessão.',
  })
  @ApiOkResponse({ description: 'Pedido cancelado com sucesso.', type: OrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'Id ou corpo inválido, ou motivo recusado. O corpo traz o campo `code`: ' +
      '`CANCELLATION_REASON_REQUIRED` (motivo ausente) ou `INVALID_CANCELLATION_REASON` (motivo ' +
      'inexistente ou de sistema). O motivo é conferido antes do status do pedido.',
  })
  @ApiNotFoundResponse({
    description:
      'Nenhuma instituição vinculada ao usuário, ou pedido inexistente, excluído ou de que o ' +
      'solicitante não é parte.',
  })
  @ApiConflictResponse({
    description:
      'Pedido não está em aberto (já "Rejeitado", "Doado" ou "Cancelado"). O corpo traz ' +
      '`code: ORDER_NOT_OPEN`.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  cancel(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancel(Number(session.user.id), id, dto);
  }
}

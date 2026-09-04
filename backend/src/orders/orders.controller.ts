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

import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('Pedidos')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Solicitação de pedido de doação',
    description:
      'Cria um pedido de doação da entidade beneficiária autenticada para um alimento ' +
      'disponível, informando o alimento e a quantidade desejada (RF14). O pedido inicia ' +
      'com status "Pendente"; os vínculos com a entidade e com o estabelecimento são ' +
      'resolvidos pela sessão e pelo alimento. Exclusivo de entidade beneficiária. ' +
      'A entidade é impedida de criar um novo pedido enquanto tiver 10 ou mais pedidos ' +
      'em andamento (RF15).',
  })
  @ApiCreatedResponse({ description: 'Pedido criado com sucesso.', type: OrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou quantidade acima da disponível no alimento.',
  })
  @ApiNotFoundResponse({
    description: 'Nenhuma entidade beneficiária vinculada ao usuário, ou alimento indisponível.',
  })
  @ApiConflictResponse({
    description:
      'A entidade beneficiária já possui 10 ou mais pedidos em andamento e não pode criar ' +
      'um novo pedido até encerrar algum deles (RF15).',
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
      'os pedidos que criou (RF19). Filtro opcional `status` (`Pendente` | `Aceito` | ' +
      '`Rejeitado` | `Recebido`) para separar por status; ausente traz todos. Paginação por ' +
      '`page` (default 1) e `pageSize` (default 20, máximo 50). Ordenado do pedido mais ' +
      'recente para o mais antigo.',
  })
  @ApiOkResponse({
    description: 'Página de pedidos do solicitante.',
    type: PaginatedOrdersResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Parâmetro `status`, `page` ou `pageSize` inválido.' })
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

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Aceite de pedido de doação',
    description:
      'O estabelecimento autenticado aceita um pedido "Pendente" que recebeu, reservando a ' +
      'quantidade do alimento vinculado — a quantidade aceita é subtraída do estoque do ' +
      'alimento e o pedido passa para "Aceito" (RF16). O pedido é resolvido pela sessão; ' +
      'exclusivo do estabelecimento dono do pedido.',
  })
  @ApiOkResponse({ description: 'Pedido aceito com sucesso.', type: OrderResponseDto })
  @ApiNotFoundResponse({
    description:
      'Nenhum estabelecimento vinculado ao usuário, ou pedido inexistente / de outro estabelecimento.',
  })
  @ApiConflictResponse({
    description:
      'Pedido não está "Pendente", alimento vinculado indisponível, ou estoque insuficiente ' +
      'para cobrir a quantidade do pedido.',
  })
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
      '(pedido "Pendente" nunca reservou quantidade) (RF17). O pedido é resolvido pela ' +
      'sessão; exclusivo do estabelecimento dono do pedido. Não há motivo de rejeição.',
  })
  @ApiOkResponse({ description: 'Pedido rejeitado com sucesso.', type: OrderResponseDto })
  @ApiNotFoundResponse({
    description:
      'Nenhum estabelecimento vinculado ao usuário, ou pedido inexistente / de outro estabelecimento.',
  })
  @ApiConflictResponse({ description: 'Pedido não está "Pendente" (já "Aceito" ou "Rejeitado").' })
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
      '"Aceito" que é dela — o pedido passa para o status terminal "Recebido", encerrando-o ' +
      '(RF18). O estoque do alimento não muda: a quantidade já foi reservada no aceite. O ' +
      'pedido é resolvido pela sessão; exclusivo da entidade beneficiária dona do pedido.',
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
    description: 'Pedido não está "Aceito" (ainda "Pendente", ou já "Rejeitado" / "Recebido").',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  receive(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.ordersService.receive(Number(session.user.id), id);
  }
}

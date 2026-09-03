import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
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
      'resolvidos pela sessão e pelo alimento. Exclusivo de entidade beneficiária.',
  })
  @ApiCreatedResponse({ description: 'Pedido criado com sucesso.', type: OrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou quantidade acima da disponível no alimento.',
  })
  @ApiNotFoundResponse({
    description: 'Nenhuma entidade beneficiária vinculada ao usuário, ou alimento indisponível.',
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  create(@Session() session: UserSession, @Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(Number(session.user.id), dto);
  }
}

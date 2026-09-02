import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food-response.dto';
import { ListFoodsQueryDto } from './dto/list-foods-query.dto';
import { PaginatedFoodsResponseDto } from './dto/paginated-foods-response.dto';
import { FoodsService } from './foods.service';

@ApiTags('Alimentos')
@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastro de alimento',
    description:
      'Cadastra um alimento vinculado ao estabelecimento autenticado, informando imagem, ' +
      'nome, categoria, quantidade, descrição e data de vencimento (RF10). Fica disponível ' +
      'na plataforma imediatamente, sem etapa de revisão.',
  })
  @ApiCreatedResponse({ description: 'Alimento cadastrado com sucesso.', type: FoodResponseDto })
  @ApiBadRequestResponse({ description: 'Dados de cadastro inválidos.' })
  @ApiNotFoundResponse({ description: 'Nenhum estabelecimento vinculado ao usuário autenticado.' })
  create(@Session() session: UserSession, @Body() dto: CreateFoodDto): Promise<FoodResponseDto> {
    return this.foodsService.create(Number(session.user.id), dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listagem e busca de alimentos',
    description:
      'Lista, de forma paginada, os alimentos disponíveis na plataforma — status "Ativo", ' +
      'não excluídos e não vencidos — cadastrados por qualquer estabelecimento (RF11). ' +
      'Aceita filtros opcionais de busca (RF12): `name` e `city` casam por trecho ignorando ' +
      'caixa e acento, `categoryId` filtra pela categoria e `state` pela UF do estabelecimento ' +
      'de origem; filtros informados combinam por E. Requer usuário autenticado.',
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
}

import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food-response.dto';
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
}

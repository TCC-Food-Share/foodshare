import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
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

import { RequireRoles } from '../auth/require-roles.decorator';
import { INSTITUTION_ROLES } from '../auth/roles.constants';
import { ImageFilePipe, type ValidatedImage } from '../files/image-file.pipe';
import { ImageUpload } from '../files/image-upload.decorator';
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food-response.dto';
import { ListFoodsQueryDto } from './dto/list-foods-query.dto';
import { PaginatedFoodsResponseDto } from './dto/paginated-foods-response.dto';
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
      'Dados inválidos, item do catálogo ou unidade inexistentes (`code: INVALID_CATALOG_ITEM`, ' +
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

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de um alimento',
    description:
      'Retorna os dados completos de um alimento disponível — status "Ativo", não excluído ' +
      'e não vencido — identificado por id (RF21). Alimento fora desse conjunto responde 404. ' +
      'Requer usuário autenticado.',
  })
  @ApiOkResponse({ description: 'Dados completos do alimento.', type: FoodResponseDto })
  @ApiBadRequestResponse({ description: 'Id em formato inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'Nenhum alimento disponível com o id informado.' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<FoodResponseDto> {
    return this.foodsService.getById(id);
  }
}

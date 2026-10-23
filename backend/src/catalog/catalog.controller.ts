import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { RequireRoles } from '../auth/require-roles.decorator';
import { INSTITUTION_ROLES } from '../auth/roles.constants';
import { CatalogService } from './catalog.service';
import {
  CancellationReasonResponseDto,
  CategoryResponseDto,
  FoodCatalogItemResponseDto,
  MeasurementUnitResponseDto,
} from './dto/catalog-response.dto';
import { CatalogSearchQueryDto } from './dto/catalog-search-query.dto';

@ApiTags('Listas padronizadas')
@ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
@RequireRoles(...INSTITUTION_ROLES)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Categorias de alimento',
    description:
      'Lista as categorias na ordem do cadastro, com busca opcional pelo nome sem diferenciar ' +
      'maiúsculas nem acentos. Usada no filtro do feed (RF20).',
  })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  listCategories(@Query() query: CatalogSearchQueryDto): Promise<CategoryResponseDto[]> {
    return this.catalogService.listCategories(query.search);
  }

  @Get('food-items')
  @ApiOperation({
    summary: 'Catálogo de alimentos',
    description:
      'Lista os itens do catálogo em ordem alfabética, cada um com a sua categoria, com busca ' +
      'opcional pelo nome sem diferenciar maiúsculas nem acentos ("pao" encontra "Pão francês").',
  })
  @ApiOkResponse({ type: FoodCatalogItemResponseDto, isArray: true })
  listFoodItems(@Query() query: CatalogSearchQueryDto): Promise<FoodCatalogItemResponseDto[]> {
    return this.catalogService.listFoodItems(query.search);
  }

  @Get('measurement-units')
  @ApiOperation({
    summary: 'Unidades de medida',
    description:
      'Lista as unidades na ordem do cadastro, com busca opcional pelo nome ou pela sigla, sem ' +
      'diferenciar maiúsculas nem acentos.',
  })
  @ApiOkResponse({ type: MeasurementUnitResponseDto, isArray: true })
  listMeasurementUnits(
    @Query() query: CatalogSearchQueryDto,
  ): Promise<MeasurementUnitResponseDto[]> {
    return this.catalogService.listMeasurementUnits(query.search);
  }

  @Get('cancellation-reasons')
  @ApiOperation({
    summary: 'Motivos de cancelamento',
    description:
      'Lista os motivos que a instituição pode escolher ao cancelar um pedido, na ordem do ' +
      'cadastro, com busca opcional pelo nome. Os motivos de sistema nunca aparecem (RN31).',
  })
  @ApiOkResponse({ type: CancellationReasonResponseDto, isArray: true })
  listCancellationReasons(
    @Query() query: CatalogSearchQueryDto,
  ): Promise<CancellationReasonResponseDto[]> {
    return this.catalogService.listCancellationReasons(query.search);
  }
}

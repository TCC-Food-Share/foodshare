import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('Alimentos')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listagem de categorias',
    description:
      'Lista a lista fixa de categorias de alimento, ordenada por id. Usada pelo filtro de ' +
      'busca de alimentos (RF12) e pela seleção de categoria no cadastro de alimento (RF10). ' +
      'Requer usuário autenticado.',
  })
  @ApiOkResponse({
    description: 'Lista completa de categorias.',
    type: CategoryResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  list(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.list();
  }
}

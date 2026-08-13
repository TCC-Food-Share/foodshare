import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CriarEstabelecimentoDto } from './dto/criar-estabelecimento.dto';
import { EstabelecimentoResponseDto } from './dto/estabelecimento-response.dto';
import { EstabelecimentosService } from './estabelecimentos.service';

@ApiTags('Estabelecimentos')
@Controller('estabelecimentos')
export class EstabelecimentosController {
  constructor(private readonly estabelecimentosService: EstabelecimentosService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar estabelecimento',
    description:
      'Cadastra um estabelecimento informando dados pessoais do responsável, dados ' +
      'institucionais e endereço (RF01). Impede duplicidade de CNPJ, e-mail ou celular ' +
      'já cadastrados (RF02).',
  })
  @ApiCreatedResponse({
    description: 'Estabelecimento cadastrado com sucesso.',
    type: EstabelecimentoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de cadastro inválidos.' })
  @ApiConflictResponse({
    description: 'CNPJ, e-mail ou celular já cadastrados por outro estabelecimento ou usuário.',
  })
  criar(@Body() dto: CriarEstabelecimentoDto): Promise<EstabelecimentoResponseDto> {
    return this.estabelecimentosService.criar(dto);
  }
}

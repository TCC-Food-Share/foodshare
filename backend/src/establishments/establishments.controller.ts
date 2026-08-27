import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { EstablishmentResponseDto } from './dto/establishment-response.dto';
import { EstablishmentsService } from './establishments.service';

@ApiTags('Estabelecimentos')
@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  @Post()
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Cadastro de estabelecimento',
    description:
      'Cadastra um estabelecimento com dados do responsável, dados institucionais e ' +
      'endereço (RF01). Impede CNPJ, e-mail ou celular duplicados (RF02).',
  })
  @ApiCreatedResponse({
    description: 'Estabelecimento cadastrado com sucesso.',
    type: EstablishmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de cadastro inválidos.' })
  @ApiConflictResponse({
    description: 'CNPJ, e-mail ou celular já cadastrados por outro estabelecimento ou usuário.',
  })
  create(@Body() dto: CreateEstablishmentDto): Promise<EstablishmentResponseDto> {
    return this.establishmentsService.create(dto);
  }
}

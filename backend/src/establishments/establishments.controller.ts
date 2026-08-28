import { Body, Controller, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';

import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { EstablishmentResponseDto } from './dto/establishment-response.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
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

  @Patch('me')
  @ApiOperation({
    summary: 'Edição do próprio cadastro',
    description:
      'Edita contato, imagem, descrição e endereço do estabelecimento autenticado (RF05). ' +
      'CNPJ, razão social e e-mail pessoal não são editáveis por este endpoint.',
  })
  @ApiOkResponse({
    description: 'Cadastro atualizado com sucesso.',
    type: EstablishmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de edição inválidos.' })
  @ApiConflictResponse({
    description: 'Celular institucional ou e-mail institucional já usados por outro cadastro.',
  })
  @ApiNotFoundResponse({ description: 'Nenhum estabelecimento vinculado ao usuário autenticado.' })
  update(
    @Session() session: UserSession,
    @Body() dto: UpdateEstablishmentDto,
  ): Promise<EstablishmentResponseDto> {
    return this.establishmentsService.update(Number(session.user.id), dto);
  }
}

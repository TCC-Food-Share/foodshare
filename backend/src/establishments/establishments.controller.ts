import { Body, Controller, Get, Patch, Post, UploadedFile } from '@nestjs/common';
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

import { RequireRoles } from '../auth/require-roles.decorator';
import { INSTITUTION_ROLES } from '../auth/roles.constants';
import { ImageFilePipe, type ValidatedImage } from '../files/image-file.pipe';
import { ImageUpload } from '../files/image-upload.decorator';
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
      'endereço, e impede CNPJ, e-mail ou celular duplicados (RF01). ' +
      'A imagem do responsável é obrigatória e vai no mesmo formulário.',
  })
  @ImageUpload({ body: CreateEstablishmentDto, required: true })
  @ApiCreatedResponse({
    description: 'Estabelecimento cadastrado com sucesso.',
    type: EstablishmentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados de cadastro inválidos, ou imagem ausente ou recusada ' +
      '(`code: IMAGE_REQUIRED`, `IMAGE_TOO_LARGE` ou `IMAGE_INVALID_TYPE`).',
  })
  @ApiConflictResponse({
    description: 'CNPJ, e-mail ou celular já cadastrados por outro estabelecimento ou usuário.',
  })
  create(
    @Body() dto: CreateEstablishmentDto,
    @UploadedFile(new ImageFilePipe({ required: true })) image: ValidatedImage,
  ): Promise<EstablishmentResponseDto> {
    return this.establishmentsService.create(dto, image);
  }

  @Get('me')
  @RequireRoles(...INSTITUTION_ROLES)
  @ApiOperation({
    summary: 'Consulta do próprio cadastro',
    description: 'Retorna o cadastro completo do estabelecimento autenticado, sem a senha.',
  })
  @ApiOkResponse({
    description: 'Cadastro do estabelecimento autenticado.',
    type: EstablishmentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Nenhum estabelecimento vinculado ao usuário autenticado.' })
  findMe(@Session() session: UserSession): Promise<EstablishmentResponseDto> {
    return this.establishmentsService.findMe(Number(session.user.id));
  }

  @Patch('me')
  @RequireRoles(...INSTITUTION_ROLES)
  @ApiOperation({
    summary: 'Edição do próprio cadastro',
    description:
      'Edita contato, imagem, descrição e endereço do estabelecimento autenticado (RF03). ' +
      'CNPJ, razão social e e-mail pessoal não são editáveis por este endpoint. ' +
      'A imagem nova, opcional, vai como arquivo no mesmo formulário; sem ela, o corpo pode ser JSON.',
  })
  @ImageUpload({ body: UpdateEstablishmentDto, required: false })
  @ApiOkResponse({
    description: 'Cadastro atualizado com sucesso.',
    type: EstablishmentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados de edição inválidos, ou imagem recusada (`code: IMAGE_TOO_LARGE` ou `IMAGE_INVALID_TYPE`).',
  })
  @ApiConflictResponse({
    description: 'Celular institucional ou e-mail institucional já usados por outro cadastro.',
  })
  @ApiNotFoundResponse({ description: 'Nenhum estabelecimento vinculado ao usuário autenticado.' })
  update(
    @Session() session: UserSession,
    @Body() dto: UpdateEstablishmentDto,
    @UploadedFile(new ImageFilePipe({ required: false })) image: ValidatedImage | undefined,
  ): Promise<EstablishmentResponseDto> {
    return this.establishmentsService.update(Number(session.user.id), dto, image);
  }
}

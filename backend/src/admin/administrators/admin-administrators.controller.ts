import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { AdminController } from '../../auth/admin-controller.decorator';
import { ImageFilePipe, type ValidatedImage } from '../../files/image-file.pipe';
import { ImageUpload } from '../../files/image-upload.decorator';
import { sessionAdministrator } from '../lists/common/session-administrator';
import { AdminAdministratorsService } from './admin-administrators.service';
import {
  AdministratorDto,
  CreateAdministratorDto,
  ListAdministratorsQueryDto,
  PaginatedAdministratorsDto,
  UpdateAdministratorDto,
} from './administrator.dto';

const UNAUTHORIZED = 'Requisição sem sessão autenticada válida.';
const NOT_FOUND = 'Nenhum administrador com esse identificador.';

@AdminController('administrators')
export class AdminAdministratorsController {
  constructor(private readonly service: AdminAdministratorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Administradores (painel)',
    description:
      'RF32: lista os administradores com busca por identificador, nome ou e-mail, ordenação e ' +
      'paginação. Cada linha diz se o e-mail já foi confirmado (DT48).',
  })
  @ApiOkResponse({ type: PaginatedAdministratorsDto })
  @ApiBadRequestResponse({ description: 'Parâmetros de busca inválidos.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  list(@Query() query: ListAdministratorsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastro de administrador',
    description:
      'RF29. A conta nasce com o e-mail não confirmado e recebe o código de confirmação (DT39). ' +
      'Auditado.',
  })
  @ImageUpload({ body: CreateAdministratorDto, required: true })
  @ApiCreatedResponse({ type: AdministratorDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou imagem ausente/inválida.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiConflictResponse({ description: 'E-mail já cadastrado (`code: EMAIL_ALREADY_REGISTERED`).' })
  create(
    @Session() session: UserSession,
    @Body() dto: CreateAdministratorDto,
    @UploadedFile(new ImageFilePipe({ required: true })) image: ValidatedImage,
  ): Promise<AdministratorDto> {
    return this.service.create(sessionAdministrator(session), dto, image);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edição de administrador',
    description:
      'RF30: só os campos enviados (nome, e-mail, imagem). Trocar o e-mail vale na hora, sem nova ' +
      'confirmação (DT47). Auditado.',
  })
  @ImageUpload({ body: UpdateAdministratorDto, required: false })
  @ApiOkResponse({ type: AdministratorDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou imagem inválida.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: 'E-mail já cadastrado (`code: EMAIL_ALREADY_REGISTERED`).' })
  update(
    @Session() session: UserSession,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdministratorDto,
    @UploadedFile(new ImageFilePipe({ required: false })) image: ValidatedImage | undefined,
  ): Promise<AdministratorDto> {
    return this.service.update(sessionAdministrator(session), id, dto, image);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclusão permanente de administrador',
    description:
      'RF31: apaga a conta, as sessões e a imagem. Não exclui a própria conta (DT46) e sempre ' +
      'mantém um administrador confirmado (RN34). Auditada.',
  })
  @ApiNoContentResponse({ description: 'Administrador excluído.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({
    description:
      'Exclusão da própria conta (`code: CANNOT_DELETE_SELF`) ou do último administrador ' +
      'confirmado (`code: LAST_ADMINISTRATOR`).',
  })
  async remove(@Session() session: UserSession, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(sessionAdministrator(session), id);
  }
}

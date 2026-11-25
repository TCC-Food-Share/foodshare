import {
  BadRequestException,
  Body,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  PipeTransform,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { DeletionImpactResponseDto } from '../../account-deletion/dto/deletion-impact-response.dto';
import { AdminController } from '../../auth/admin-controller.decorator';
import { CreateBeneficiaryEntityDto } from '../../beneficiary-entities/dto/create-beneficiary-entity.dto';
import { CreateEstablishmentDto } from '../../establishments/dto/create-establishment.dto';
import { ImageFilePipe, type ValidatedImage } from '../../files/image-file.pipe';
import { ImageUpload } from '../../files/image-upload.decorator';
import { INSTITUTION_KIND, type InstitutionKind } from '../../institutions/institution-kind';
import { sessionAdministrator } from '../lists/common/session-administrator';
import {
  AdminInstitutionProfileDto,
  AdminPageQueryDto,
  AdminUpdateInstitutionDto,
  ListAdminInstitutionsQueryDto,
  PaginatedAdminInstitutionFoodsDto,
  PaginatedAdminInstitutionOrdersDto,
  PaginatedAdminInstitutionsDto,
} from './admin-institution.dto';
import { AdminInstitutionsService } from './admin-institutions.service';

const KIND_SEGMENTS: Record<string, InstitutionKind> = {
  establishments: INSTITUTION_KIND.ESTABLISHMENT,
  'beneficiary-entities': INSTITUTION_KIND.BENEFICIARY_ENTITY,
};

@Injectable()
export class ParseKindSegmentPipe implements PipeTransform<string, InstitutionKind> {
  transform(value: string): InstitutionKind {
    const kind = KIND_SEGMENTS[value];
    if (!kind) {
      throw new BadRequestException('kind must be one of: establishments, beneficiary-entities');
    }
    return kind;
  }
}

const KIND_PARAM = {
  name: 'kind',
  enum: Object.keys(KIND_SEGMENTS),
  description: 'Tipo da instituição',
};

const UNAUTHORIZED = 'Requisição sem sessão autenticada válida.';
const NOT_FOUND = 'Nenhuma instituição desse tipo com esse identificador.';
const DUPLICATE =
  'CNPJ, e-mail ou celular já usados por qualquer instituição ou usuário ' +
  '(`code: INSTITUTION_DATA_ALREADY_REGISTERED`, com `fields`).';
const CREATE_BAD_REQUEST =
  'Dados inválidos, termo proibido (`code: PROHIBITED_CONTENT`, com `fields`) ou imagem ausente ' +
  'ou recusada (`IMAGE_REQUIRED`, `IMAGE_TOO_LARGE`, `IMAGE_INVALID_TYPE`).';

@AdminController('institutions')
export class AdminInstitutionsController {
  constructor(private readonly service: AdminInstitutionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Instituições (painel)',
    description:
      'RF47, RF57, RF58: estabelecimentos e entidades juntos, inclusive excluídos e não ' +
      'confirmados, com os dados do responsável. `search` casa qualquer campo do RF47 sem acento, ' +
      'CNPJ, celulares e CEP com ou sem pontuação, e a data de cadastro em dd/mm/aaaa (fuso de ' +
      'Brasília). Sem `sort`, a ordem é a data de cadastro mais recente primeiro (DT53).',
  })
  @ApiOkResponse({ type: PaginatedAdminInstitutionsDto })
  @ApiBadRequestResponse({ description: 'Parâmetros de busca inválidos.' })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  list(@Query() query: ListAdminInstitutionsQueryDto) {
    return this.service.list(query);
  }

  @Post('establishments')
  @ApiOperation({
    summary: 'Cadastro de estabelecimento pelo painel',
    description:
      'RF41. Mesmos campos do cadastro público. A conta nasce com o e-mail não confirmado e ' +
      'recebe o código (DT39); sem confirmar em 24 horas, é apagada (RN48). Auditado.',
  })
  @ImageUpload({ body: CreateEstablishmentDto, required: true })
  @ApiCreatedResponse({ type: AdminInstitutionProfileDto })
  @ApiBadRequestResponse({ description: CREATE_BAD_REQUEST })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiConflictResponse({ description: DUPLICATE })
  createEstablishment(
    @Session() session: UserSession,
    @Body() dto: CreateEstablishmentDto,
    @UploadedFile(new ImageFilePipe({ required: true })) image: ValidatedImage,
  ): Promise<AdminInstitutionProfileDto> {
    return this.service.create(
      sessionAdministrator(session),
      INSTITUTION_KIND.ESTABLISHMENT,
      dto,
      image,
    );
  }

  @Post('beneficiary-entities')
  @ApiOperation({
    summary: 'Cadastro de entidade beneficiária pelo painel',
    description:
      'RF41. Mesmos campos do cadastro público. A conta nasce com o e-mail não confirmado e ' +
      'recebe o código (DT39); sem confirmar em 24 horas, é apagada (RN48). Auditado.',
  })
  @ImageUpload({ body: CreateBeneficiaryEntityDto, required: true })
  @ApiCreatedResponse({ type: AdminInstitutionProfileDto })
  @ApiBadRequestResponse({ description: CREATE_BAD_REQUEST })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiConflictResponse({ description: DUPLICATE })
  createBeneficiaryEntity(
    @Session() session: UserSession,
    @Body() dto: CreateBeneficiaryEntityDto,
    @UploadedFile(new ImageFilePipe({ required: true })) image: ValidatedImage,
  ): Promise<AdminInstitutionProfileDto> {
    return this.service.create(
      sessionAdministrator(session),
      INSTITUTION_KIND.BENEFICIARY_ENTITY,
      dto,
      image,
    );
  }

  @Get('establishments/:id/foods')
  @ApiOperation({
    summary: 'Alimentos de um estabelecimento (painel)',
    description: 'RF48: todos os alimentos, inclusive excluídos, do mais recente ao mais antigo.',
  })
  @ApiOkResponse({ type: PaginatedAdminInstitutionFoodsDto })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  listFoods(@Param('id', ParseIntPipe) id: number, @Query() query: AdminPageQueryDto) {
    return this.service.listFoods(id, query);
  }

  @Get(':kind/:id/orders')
  @ApiParam(KIND_PARAM)
  @ApiOperation({
    summary: 'Pedidos de uma instituição (painel)',
    description:
      'RF48: pedidos recebidos (estabelecimento) ou feitos (entidade), inclusive excluídos, do ' +
      'mais recente ao mais antigo.',
  })
  @ApiOkResponse({ type: PaginatedAdminInstitutionOrdersDto })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  listOrders(
    @Param('kind', ParseKindSegmentPipe) kind: InstitutionKind,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: AdminPageQueryDto,
  ) {
    return this.service.listOrders(kind, id, query);
  }

  @Get(':kind/:id/impact')
  @ApiParam(KIND_PARAM)
  @ApiOperation({
    summary: 'Impacto da exclusão lógica pelo painel',
    description: 'RN28/RN29: quantos pedidos pendentes e em andamento a exclusão afetaria.',
  })
  @ApiOkResponse({ type: DeletionImpactResponseDto })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  impact(
    @Param('kind', ParseKindSegmentPipe) kind: InstitutionKind,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.impact(kind, id);
  }

  @Get(':kind/:id')
  @ApiParam(KIND_PARAM)
  @ApiOperation({
    summary: 'Perfil completo da instituição (painel)',
    description:
      'RF48, RF57: dados institucionais, endereço, responsável, situação e indicadores de ' +
      'atividade (DT51). Somente leitura.',
  })
  @ApiOkResponse({ type: AdminInstitutionProfileDto })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  getProfile(
    @Param('kind', ParseKindSegmentPipe) kind: InstitutionKind,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminInstitutionProfileDto> {
    return this.service.getProfile(kind, id);
  }

  @Patch(':kind/:id')
  @ApiParam(KIND_PARAM)
  @ApiOperation({
    summary: 'Edição de instituição pelo painel',
    description:
      'RF44: só os campos enviados. E-mail pessoal, CNPJ e razão social são recusados (RN27). ' +
      '`deleted = true` com `cancellationReasonId` aplica a exclusão lógica (RN28/RN29, DT49); ' +
      '`deleted = false` restaura (DT50). Tudo numa transação. Auditado.',
  })
  @ImageUpload({ body: AdminUpdateInstitutionDto, required: false })
  @ApiOkResponse({ type: AdminInstitutionProfileDto })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos, campo não editável, termo proibido, imagem recusada, motivo ausente ' +
      '(`CANCELLATION_REASON_REQUIRED`), inexistente ou de sistema (`INVALID_CANCELLATION_REASON`), ' +
      'ou motivo sem `deleted = true` (`CANCELLATION_REASON_WITHOUT_DELETE`).',
  })
  @ApiUnauthorizedResponse({ description: UNAUTHORIZED })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: DUPLICATE })
  update(
    @Session() session: UserSession,
    @Param('kind', ParseKindSegmentPipe) kind: InstitutionKind,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateInstitutionDto,
    @UploadedFile(new ImageFilePipe({ required: false })) image: ValidatedImage | undefined,
  ): Promise<AdminInstitutionProfileDto> {
    return this.service.update(sessionAdministrator(session), kind, id, dto, image);
  }
}

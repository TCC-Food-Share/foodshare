import {
  Body,
  Controller,
  Get,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';

import { RequireRoles } from '../auth/require-roles.decorator';
import { INSTITUTION_ROLES, ROLE } from '../auth/roles.constants';
import {
  InstitutionPublicProfileDto,
  PaginatedInstitutionsResponseDto,
} from '../common/institution-public.dto';
import { ListInstitutionsQueryDto } from '../common/list-institutions-query.dto';
import { ImageFilePipe, type ValidatedImage } from '../files/image-file.pipe';
import { ImageUpload } from '../files/image-upload.decorator';
import { SignupThrottle } from '../rate-limit/signup-throttle.decorator';
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
  @SignupThrottle()
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
      'Dados de cadastro inválidos, termo proibido ou link em texto livre ' +
      '(`code: PROHIBITED_CONTENT`, com `fields`), ou imagem ausente ou recusada ' +
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

  @Get()
  @RequireRoles(ROLE.BENEFICIARY_ENTITY)
  @ApiOperation({
    summary: 'Listagem pública de estabelecimentos',
    description:
      'Lista, de forma paginada e em ordem alfabética do nome público, os estabelecimentos não ' +
      'excluídos e com e-mail confirmado (RF10, RN35, DT41). Cada item traz só dados públicos ' +
      '(RN36): nome fantasia ou, sem ele, razão social, imagem, cidade e UF. `search` casa nome ' +
      'fantasia, razão social e descrição ignorando caixa e acento, e o CNPJ quando o texto tem só ' +
      'dígitos e pontuação; `city` e `state` filtram pelo endereço. Só a entidade beneficiária acessa.',
  })
  @ApiOkResponse({
    description: 'Página de estabelecimentos.',
    type: PaginatedInstitutionsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Parâmetro de busca ou de paginação inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  listPublic(@Query() query: ListInstitutionsQueryDto): Promise<PaginatedInstitutionsResponseDto> {
    return this.establishmentsService.listPublic(query);
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
      'Edita nome fantasia, e-mail e celular institucionais, celular pessoal, nome do responsável, ' +
      'imagem, descrição e endereço do estabelecimento autenticado (RF03). ' +
      'Nome fantasia enviado vazio apaga o valor. ' +
      'CNPJ, razão social e e-mail pessoal não são editáveis (RN27) e são recusados com `400`. ' +
      'A imagem nova, opcional, vai como arquivo no mesmo formulário; sem ela, o corpo pode ser JSON.',
  })
  @ImageUpload({ body: UpdateEstablishmentDto, required: false })
  @ApiOkResponse({
    description: 'Cadastro atualizado com sucesso.',
    type: EstablishmentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados de edição inválidos, termo proibido ou link em texto livre ' +
      '(`code: PROHIBITED_CONTENT`, com `fields`), ou imagem recusada ' +
      '(`code: IMAGE_TOO_LARGE` ou `IMAGE_INVALID_TYPE`).',
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

  @Get(':id')
  @RequireRoles(ROLE.BENEFICIARY_ENTITY)
  @ApiOperation({
    summary: 'Perfil público de estabelecimento',
    description:
      'Retorna o perfil público (RF13, RN36): nome fantasia ou, sem ele, razão social, imagem, ' +
      'descrição, cidade e UF. Nunca traz contato, endereço, CNPJ ou dado do responsável. ' +
      'Estabelecimento excluído, inexistente ou com e-mail não confirmado responde `404` ' +
      '(RN35, DT41). Só a entidade beneficiária acessa.',
  })
  @ApiOkResponse({
    description: 'Perfil público.',
    type: InstitutionPublicProfileDto,
  })
  @ApiBadRequestResponse({ description: 'Id em formato inválido.' })
  @ApiNotFoundResponse({ description: 'Instituição não encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  findPublic(@Param('id', ParseIntPipe) id: number): Promise<InstitutionPublicProfileDto> {
    return this.establishmentsService.findPublic(id);
  }
}

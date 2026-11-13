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
import { BeneficiaryEntitiesService } from './beneficiary-entities.service';
import { BeneficiaryEntityResponseDto } from './dto/beneficiary-entity-response.dto';
import { CreateBeneficiaryEntityDto } from './dto/create-beneficiary-entity.dto';
import { UpdateBeneficiaryEntityDto } from './dto/update-beneficiary-entity.dto';

@ApiTags('Entidades Beneficiárias')
@Controller('beneficiary-entities')
export class BeneficiaryEntitiesController {
  constructor(private readonly beneficiaryEntitiesService: BeneficiaryEntitiesService) {}

  @Post()
  @AllowAnonymous()
  @SignupThrottle()
  @ApiOperation({
    summary: 'Cadastro de entidade beneficiária',
    description:
      'Cadastra uma entidade beneficiária com dados do responsável, dados institucionais ' +
      'e endereço, e impede CNPJ, e-mail ou celular duplicados (RF02). A imagem do responsável é obrigatória e vai no mesmo formulário.',
  })
  @ImageUpload({ body: CreateBeneficiaryEntityDto, required: true })
  @ApiCreatedResponse({
    description: 'Entidade beneficiária cadastrada com sucesso.',
    type: BeneficiaryEntityResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados de cadastro inválidos, termo proibido ou link em texto livre ' +
      '(`code: PROHIBITED_CONTENT`, com `fields`), ou imagem ausente ou recusada ' +
      '(`code: IMAGE_REQUIRED`, `IMAGE_TOO_LARGE` ou `IMAGE_INVALID_TYPE`).',
  })
  @ApiConflictResponse({
    description: 'CNPJ, e-mail ou celular já cadastrados por outra entidade ou usuário.',
  })
  create(
    @Body() dto: CreateBeneficiaryEntityDto,
    @UploadedFile(new ImageFilePipe({ required: true })) image: ValidatedImage,
  ): Promise<BeneficiaryEntityResponseDto> {
    return this.beneficiaryEntitiesService.create(dto, image);
  }

  @Get()
  @RequireRoles(ROLE.ESTABLISHMENT)
  @ApiOperation({
    summary: 'Listagem pública de entidades beneficiárias',
    description:
      'Lista, de forma paginada e em ordem alfabética do nome público, as entidades beneficiárias não ' +
      'excluídas e com e-mail confirmado (RF10, RN35, DT41). Cada item traz só dados públicos ' +
      '(RN36): nome fantasia ou, sem ele, razão social, imagem, cidade e UF. `search` casa nome ' +
      'fantasia, razão social e descrição ignorando caixa e acento, e o CNPJ quando o texto tem só ' +
      'dígitos e pontuação; `city` e `state` filtram pelo endereço. Só o estabelecimento acessa.',
  })
  @ApiOkResponse({
    description: 'Página de entidades beneficiárias.',
    type: PaginatedInstitutionsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Parâmetro de busca ou de paginação inválido.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  listPublic(@Query() query: ListInstitutionsQueryDto): Promise<PaginatedInstitutionsResponseDto> {
    return this.beneficiaryEntitiesService.listPublic(query);
  }

  @Get('me')
  @RequireRoles(...INSTITUTION_ROLES)
  @ApiOperation({
    summary: 'Consulta do próprio cadastro',
    description: 'Retorna o cadastro completo da entidade beneficiária autenticada, sem a senha.',
  })
  @ApiOkResponse({
    description: 'Cadastro da entidade beneficiária autenticada.',
    type: BeneficiaryEntityResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Nenhuma entidade beneficiária vinculada ao usuário autenticado.',
  })
  findMe(@Session() session: UserSession): Promise<BeneficiaryEntityResponseDto> {
    return this.beneficiaryEntitiesService.findMe(Number(session.user.id));
  }

  @Patch('me')
  @RequireRoles(...INSTITUTION_ROLES)
  @ApiOperation({
    summary: 'Edição do próprio cadastro',
    description:
      'Edita nome fantasia, e-mail e celular institucionais, celular pessoal, nome do responsável, ' +
      'imagem, descrição e endereço da entidade beneficiária autenticada (RF03). ' +
      'Nome fantasia enviado vazio apaga o valor. ' +
      'CNPJ, razão social e e-mail pessoal não são editáveis (RN27) e são recusados com `400`. ' +
      'A imagem nova, opcional, vai como arquivo no mesmo formulário; sem ela, o corpo pode ser JSON.',
  })
  @ImageUpload({ body: UpdateBeneficiaryEntityDto, required: false })
  @ApiOkResponse({
    description: 'Cadastro atualizado com sucesso.',
    type: BeneficiaryEntityResponseDto,
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
  @ApiNotFoundResponse({
    description: 'Nenhuma entidade beneficiária vinculada ao usuário autenticado.',
  })
  update(
    @Session() session: UserSession,
    @Body() dto: UpdateBeneficiaryEntityDto,
    @UploadedFile(new ImageFilePipe({ required: false })) image: ValidatedImage | undefined,
  ): Promise<BeneficiaryEntityResponseDto> {
    return this.beneficiaryEntitiesService.update(Number(session.user.id), dto, image);
  }

  @Get(':id')
  @RequireRoles(ROLE.ESTABLISHMENT)
  @ApiOperation({
    summary: 'Perfil público de entidade beneficiária',
    description:
      'Retorna o perfil público (RF12, RN36): nome fantasia ou, sem ele, razão social, imagem, ' +
      'descrição, cidade e UF. Nunca traz contato, endereço, CNPJ ou dado do responsável. ' +
      'Entidade beneficiária excluída, inexistente ou com e-mail não confirmado responde `404` ' +
      '(RN35, DT41). Só o estabelecimento acessa.',
  })
  @ApiOkResponse({
    description: 'Perfil público.',
    type: InstitutionPublicProfileDto,
  })
  @ApiBadRequestResponse({ description: 'Id em formato inválido.' })
  @ApiNotFoundResponse({ description: 'Instituição não encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  findPublic(@Param('id', ParseIntPipe) id: number): Promise<InstitutionPublicProfileDto> {
    return this.beneficiaryEntitiesService.findPublic(id);
  }
}

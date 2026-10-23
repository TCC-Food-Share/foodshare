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
      'Dados de cadastro inválidos, ou imagem ausente ou recusada ' +
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
      'Edita contato, imagem, descrição e endereço da entidade beneficiária autenticada (RF03). ' +
      'CNPJ, razão social e e-mail pessoal não são editáveis por este endpoint. ' +
      'A imagem nova, opcional, vai como arquivo no mesmo formulário; sem ela, o corpo pode ser JSON.',
  })
  @ImageUpload({ body: UpdateBeneficiaryEntityDto, required: false })
  @ApiOkResponse({
    description: 'Cadastro atualizado com sucesso.',
    type: BeneficiaryEntityResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados de edição inválidos, ou imagem recusada (`code: IMAGE_TOO_LARGE` ou `IMAGE_INVALID_TYPE`).',
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
}

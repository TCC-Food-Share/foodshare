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
  @ApiOperation({
    summary: 'Cadastro de entidade beneficiária',
    description:
      'Cadastra uma entidade beneficiária com dados do responsável, dados institucionais ' +
      'e endereço (RF03).',
  })
  @ApiCreatedResponse({
    description: 'Entidade beneficiária cadastrada com sucesso.',
    type: BeneficiaryEntityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de cadastro inválidos.' })
  @ApiConflictResponse({
    description: 'CNPJ, e-mail ou celular já cadastrados por outra entidade ou usuário.',
  })
  create(@Body() dto: CreateBeneficiaryEntityDto): Promise<BeneficiaryEntityResponseDto> {
    return this.beneficiaryEntitiesService.create(dto);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Edição do próprio cadastro',
    description:
      'Edita contato, imagem, descrição e endereço da entidade beneficiária autenticada (RF05). ' +
      'CNPJ, razão social e e-mail pessoal não são editáveis por este endpoint.',
  })
  @ApiOkResponse({
    description: 'Cadastro atualizado com sucesso.',
    type: BeneficiaryEntityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de edição inválidos.' })
  @ApiConflictResponse({
    description: 'Celular institucional ou e-mail institucional já usados por outro cadastro.',
  })
  @ApiNotFoundResponse({
    description: 'Nenhuma entidade beneficiária vinculada ao usuário autenticado.',
  })
  update(
    @Session() session: UserSession,
    @Body() dto: UpdateBeneficiaryEntityDto,
  ): Promise<BeneficiaryEntityResponseDto> {
    return this.beneficiaryEntitiesService.update(Number(session.user.id), dto);
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { BeneficiaryEntitiesService } from './beneficiary-entities.service';
import { BeneficiaryEntityResponseDto } from './dto/beneficiary-entity-response.dto';
import { CreateBeneficiaryEntityDto } from './dto/create-beneficiary-entity.dto';

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
}

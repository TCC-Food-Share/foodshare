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

@ApiTags('Beneficiary Entities')
@Controller('beneficiary-entities')
export class BeneficiaryEntitiesController {
  constructor(private readonly beneficiaryEntitiesService: BeneficiaryEntitiesService) {}

  @Post()
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Register beneficiary entity',
    description:
      'Registers a beneficiary entity with owner data, institutional data and address (RF03).',
  })
  @ApiCreatedResponse({
    description: 'Beneficiary entity registered successfully.',
    type: BeneficiaryEntityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid registration data.' })
  @ApiConflictResponse({
    description: 'CNPJ, email or phone already registered by another entity or user.',
  })
  create(@Body() dto: CreateBeneficiaryEntityDto): Promise<BeneficiaryEntityResponseDto> {
    return this.beneficiaryEntitiesService.create(dto);
  }
}

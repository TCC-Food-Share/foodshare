import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { EstablishmentResponseDto } from './dto/establishment-response.dto';
import { EstablishmentsService } from './establishments.service';

@ApiTags('Establishments')
@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  @Post()
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Register establishment',
    description:
      'Registers an establishment with owner data, institutional data and address (RF01). ' +
      'Prevents duplicate CNPJ, email or phone (RF02).',
  })
  @ApiCreatedResponse({
    description: 'Establishment registered successfully.',
    type: EstablishmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid registration data.' })
  @ApiConflictResponse({
    description: 'CNPJ, email or phone already registered by another establishment or user.',
  })
  create(@Body() dto: CreateEstablishmentDto): Promise<EstablishmentResponseDto> {
    return this.establishmentsService.create(dto);
  }
}

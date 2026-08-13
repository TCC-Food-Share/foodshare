import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CriarEntidadeBeneficiariaDto } from './dto/criar-entidade-beneficiaria.dto';
import { EntidadeBeneficiariaResponseDto } from './dto/entidade-beneficiaria-response.dto';
import { EntidadesBeneficiariasService } from './entidades-beneficiarias.service';

@ApiTags('Entidades Beneficiárias')
@Controller('entidades-beneficiarias')
export class EntidadesBeneficiariasController {
  constructor(private readonly entidadesBeneficiariasService: EntidadesBeneficiariasService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar entidade beneficiária',
    description:
      'Cadastra uma entidade beneficiária informando dados pessoais do responsável, ' +
      'dados institucionais e endereço (RF03).',
  })
  @ApiCreatedResponse({
    description: 'Entidade beneficiária cadastrada com sucesso.',
    type: EntidadeBeneficiariaResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de cadastro inválidos.' })
  @ApiConflictResponse({
    description: 'CNPJ, e-mail ou celular já cadastrados por outra entidade ou usuário.',
  })
  criar(@Body() dto: CriarEntidadeBeneficiariaDto): Promise<EntidadeBeneficiariaResponseDto> {
    return this.entidadesBeneficiariasService.criar(dto);
  }
}

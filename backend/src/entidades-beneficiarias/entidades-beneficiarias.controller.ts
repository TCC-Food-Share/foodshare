import { Body, Controller, Post } from '@nestjs/common';

import { CriarEntidadeBeneficiariaDto } from './dto/criar-entidade-beneficiaria.dto';
import { EntidadeBeneficiariaResponseDto } from './dto/entidade-beneficiaria-response.dto';
import { EntidadesBeneficiariasService } from './entidades-beneficiarias.service';

@Controller('entidades-beneficiarias')
export class EntidadesBeneficiariasController {
  constructor(private readonly entidadesBeneficiariasService: EntidadesBeneficiariasService) {}

  @Post()
  criar(@Body() dto: CriarEntidadeBeneficiariaDto): Promise<EntidadeBeneficiariaResponseDto> {
    return this.entidadesBeneficiariasService.criar(dto);
  }
}

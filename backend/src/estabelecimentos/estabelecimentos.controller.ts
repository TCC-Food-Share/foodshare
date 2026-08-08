import { Body, Controller, Post } from '@nestjs/common';

import { CriarEstabelecimentoDto } from './dto/criar-estabelecimento.dto';
import { EstabelecimentoResponseDto } from './dto/estabelecimento-response.dto';
import { EstabelecimentosService } from './estabelecimentos.service';

@Controller('estabelecimentos')
export class EstabelecimentosController {
  constructor(private readonly estabelecimentosService: EstabelecimentosService) {}

  @Post()
  criar(@Body() dto: CriarEstabelecimentoDto): Promise<EstabelecimentoResponseDto> {
    return this.estabelecimentosService.criar(dto);
  }
}

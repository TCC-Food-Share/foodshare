import { Module } from '@nestjs/common';

import { EstabelecimentosController } from './estabelecimentos.controller';
import { EstabelecimentosService } from './estabelecimentos.service';

@Module({
  controllers: [EstabelecimentosController],
  providers: [EstabelecimentosService],
})
export class EstabelecimentosModule {}

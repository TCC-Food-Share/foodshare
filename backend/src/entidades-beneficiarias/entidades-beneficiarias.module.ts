import { Module } from '@nestjs/common';

import { EntidadesBeneficiariasController } from './entidades-beneficiarias.controller';
import { EntidadesBeneficiariasService } from './entidades-beneficiarias.service';

@Module({
  controllers: [EntidadesBeneficiariasController],
  providers: [EntidadesBeneficiariasService],
})
export class EntidadesBeneficiariasModule {}

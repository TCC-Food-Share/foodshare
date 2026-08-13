import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntidadesBeneficiariasModule } from './entidades-beneficiarias/entidades-beneficiarias.module';
import { EstabelecimentosModule } from './estabelecimentos/estabelecimentos.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, EstabelecimentosModule, EntidadesBeneficiariasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

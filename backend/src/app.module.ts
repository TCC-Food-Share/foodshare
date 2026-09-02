import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BeneficiaryEntitiesModule } from './beneficiary-entities/beneficiary-entities.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { FoodsModule } from './foods/foods.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule, EstablishmentsModule, BeneficiaryEntitiesModule, FoodsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

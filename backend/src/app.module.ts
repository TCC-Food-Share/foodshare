import { Module } from '@nestjs/common';

import { AccessLogModule } from './access-log/access-log.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './auth/roles.module';
import { BeneficiaryEntitiesModule } from './beneficiary-entities/beneficiary-entities.module';
import { CategoriesModule } from './categories/categories.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { FoodsModule } from './foods/foods.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AccessLogModule,
    AuthModule,
    PrismaModule,
    RolesModule,
    AuditModule,
    EstablishmentsModule,
    BeneficiaryEntitiesModule,
    FoodsModule,
    OrdersModule,
    CategoriesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

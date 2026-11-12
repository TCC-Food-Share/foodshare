import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AccessLogModule } from './access-log/access-log.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './auth/roles.module';
import { BeneficiaryEntitiesModule } from './beneficiary-entities/beneficiary-entities.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContentModerationModule } from './content-moderation/content-moderation.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { FilesModule } from './files/files.module';
import { FoodsModule } from './foods/foods.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { SuggestionsModule } from './suggestions/suggestions.module';

@Module({
  imports: [
    // Uma única vez na aplicação (docs do @nestjs/schedule).
    ScheduleModule.forRoot(),
    RateLimitModule,
    AccessLogModule,
    AuthModule,
    PrismaModule,
    ContentModerationModule,
    RolesModule,
    AuditModule,
    FilesModule,
    EstablishmentsModule,
    BeneficiaryEntitiesModule,
    FoodsModule,
    OrdersModule,
    CatalogModule,
    SuggestionsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

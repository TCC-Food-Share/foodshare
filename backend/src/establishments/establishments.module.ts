import { Module } from '@nestjs/common';

import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { InstitutionsCoreModule } from '../institutions/institutions-core.module';
import { EstablishmentsController } from './establishments.controller';
import { EstablishmentsService } from './establishments.service';

@Module({
  imports: [AccountDeletionModule, InstitutionsCoreModule],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService],
})
export class EstablishmentsModule {}

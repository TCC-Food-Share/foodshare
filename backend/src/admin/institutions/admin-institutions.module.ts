import { Module } from '@nestjs/common';

import { AccountDeletionModule } from '../../account-deletion/account-deletion.module';
import { InstitutionsCoreModule } from '../../institutions/institutions-core.module';
import { AdminInstitutionsController } from './admin-institutions.controller';
import { AdminInstitutionsService } from './admin-institutions.service';

@Module({
  imports: [AccountDeletionModule, InstitutionsCoreModule],
  controllers: [AdminInstitutionsController],
  providers: [AdminInstitutionsService],
})
export class AdminInstitutionsModule {}

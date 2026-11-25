import { Module } from '@nestjs/common';

import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { InstitutionsCoreModule } from '../institutions/institutions-core.module';
import { BeneficiaryEntitiesController } from './beneficiary-entities.controller';
import { BeneficiaryEntitiesService } from './beneficiary-entities.service';

@Module({
  imports: [AccountDeletionModule, InstitutionsCoreModule],
  controllers: [BeneficiaryEntitiesController],
  providers: [BeneficiaryEntitiesService],
})
export class BeneficiaryEntitiesModule {}

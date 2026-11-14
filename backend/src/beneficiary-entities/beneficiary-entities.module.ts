import { Module } from '@nestjs/common';

import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { auth } from '../auth/auth.instance';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { BeneficiaryEntitiesController } from './beneficiary-entities.controller';
import { BeneficiaryEntitiesService } from './beneficiary-entities.service';

@Module({
  imports: [AccountDeletionModule],
  controllers: [BeneficiaryEntitiesController],
  providers: [BeneficiaryEntitiesService, { provide: BETTER_AUTH, useValue: auth }],
})
export class BeneficiaryEntitiesModule {}

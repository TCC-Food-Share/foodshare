import { Module } from '@nestjs/common';

import { auth } from '../auth/auth.instance';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { BeneficiaryEntitiesController } from './beneficiary-entities.controller';
import { BeneficiaryEntitiesService } from './beneficiary-entities.service';

@Module({
  controllers: [BeneficiaryEntitiesController],
  providers: [BeneficiaryEntitiesService, { provide: BETTER_AUTH, useValue: auth }],
})
export class BeneficiaryEntitiesModule {}

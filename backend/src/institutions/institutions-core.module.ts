import { Module } from '@nestjs/common';

import { auth } from '../auth/auth.instance';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { InstitutionRegistrationService } from './institution-registration.service';
import { InstitutionUniquenessService } from './institution-uniqueness.service';

@Module({
  providers: [
    InstitutionRegistrationService,
    InstitutionUniquenessService,
    { provide: BETTER_AUTH, useValue: auth },
  ],
  exports: [InstitutionRegistrationService, InstitutionUniquenessService],
})
export class InstitutionsCoreModule {}

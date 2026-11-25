import { Module } from '@nestjs/common';

import { auth } from '../../auth/auth.instance';
import { BETTER_AUTH } from '../../auth/better-auth.token';
import { AdminAdministratorsController } from './admin-administrators.controller';
import { AdminAdministratorsService } from './admin-administrators.service';

@Module({
  controllers: [AdminAdministratorsController],
  providers: [AdminAdministratorsService, { provide: BETTER_AUTH, useValue: auth }],
})
export class AdminAdministratorsModule {}

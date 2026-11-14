import { Module } from '@nestjs/common';

import { auth } from '../auth/auth.instance';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  providers: [AccountDeletionService, { provide: BETTER_AUTH, useValue: auth }],
  exports: [AccountDeletionService],
})
export class AccountDeletionModule {}

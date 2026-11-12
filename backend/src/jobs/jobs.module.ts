import { Module } from '@nestjs/common';

import { JobsService } from './jobs.service';
import { UnverifiedAccountsCleanupService } from './unverified-accounts-cleanup.service';

@Module({
  providers: [JobsService, UnverifiedAccountsCleanupService],
  exports: [JobsService],
})
export class JobsModule {}

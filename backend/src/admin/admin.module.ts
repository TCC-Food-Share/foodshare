import { Module } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';
import { AdminJobsController } from './jobs/admin-jobs.controller';
import { AdminListsModule } from './lists/admin-lists.module';

@Module({
  imports: [JobsModule, AdminListsModule],
  controllers: [AdminJobsController],
})
export class AdminModule {}

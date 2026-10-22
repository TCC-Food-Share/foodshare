import { Module } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';
import { AdminJobsController } from './jobs/admin-jobs.controller';

@Module({
  imports: [JobsModule],
  controllers: [AdminJobsController],
})
export class AdminModule {}

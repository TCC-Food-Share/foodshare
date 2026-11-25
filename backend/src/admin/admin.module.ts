import { Module } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';
import { AdminAdministratorsModule } from './administrators/admin-administrators.module';
import { AdminJobsController } from './jobs/admin-jobs.controller';
import { AdminListsModule } from './lists/admin-lists.module';
import { AdminSuggestionsModule } from './suggestions/admin-suggestions.module';

@Module({
  imports: [JobsModule, AdminAdministratorsModule, AdminListsModule, AdminSuggestionsModule],
  controllers: [AdminJobsController],
})
export class AdminModule {}

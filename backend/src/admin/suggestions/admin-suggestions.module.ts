import { Module } from '@nestjs/common';

import { AdminListsModule } from '../lists/admin-lists.module';
import { AdminSuggestionsController } from './admin-suggestions.controller';
import { AdminSuggestionsService } from './admin-suggestions.service';

@Module({
  imports: [AdminListsModule],
  controllers: [AdminSuggestionsController],
  providers: [AdminSuggestionsService],
})
export class AdminSuggestionsModule {}

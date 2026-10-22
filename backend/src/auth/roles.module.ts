import { Global, Module } from '@nestjs/common';

import { RolesGuard } from './roles.guard';
import { RolesService } from './roles.service';

@Global()
@Module({
  providers: [RolesService, RolesGuard],
  exports: [RolesService, RolesGuard],
})
export class RolesModule {}

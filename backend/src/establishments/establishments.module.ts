import { Module } from '@nestjs/common';

import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { auth } from '../auth/auth.instance';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { EstablishmentsController } from './establishments.controller';
import { EstablishmentsService } from './establishments.service';

@Module({
  imports: [AccountDeletionModule],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService, { provide: BETTER_AUTH, useValue: auth }],
})
export class EstablishmentsModule {}

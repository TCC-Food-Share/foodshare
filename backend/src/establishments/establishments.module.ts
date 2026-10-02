import { Module } from '@nestjs/common';

import { auth } from '../auth/auth.instance';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { EstablishmentsController } from './establishments.controller';
import { EstablishmentsService } from './establishments.service';

@Module({
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService, { provide: BETTER_AUTH, useValue: auth }],
})
export class EstablishmentsModule {}

import { ExecutionContext, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import {
  GLOBAL_LIMIT,
  GLOBAL_THROTTLER,
  SIGNUP_LIMIT,
  SIGNUP_THROTTLE_KEY,
  SIGNUP_THROTTLER,
} from './rate-limit.constants';
import { RateLimitGuard } from './rate-limit.guard';

const perIpKey = (_context: ExecutionContext, tracker: string, name: string) =>
  `${name}-${tracker}`;

const isSignupRoute = (context: ExecutionContext) =>
  Reflect.getMetadata(SIGNUP_THROTTLE_KEY, context.getHandler()) === true;

@Module({
  imports: [
    ThrottlerModule.forRoot({
      generateKey: perIpKey,
      throttlers: [
        { name: GLOBAL_THROTTLER, ...GLOBAL_LIMIT },
        { name: SIGNUP_THROTTLER, ...SIGNUP_LIMIT, skipIf: (context) => !isSignupRoute(context) },
      ],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule {}

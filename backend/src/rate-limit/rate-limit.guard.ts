import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { TOO_MANY_REQUESTS } from './rate-limit.constants';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected throwThrottlingException(_context: ExecutionContext): Promise<void> {
    throw new HttpException(
      { code: TOO_MANY_REQUESTS, message: 'Too many requests. Try again later.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

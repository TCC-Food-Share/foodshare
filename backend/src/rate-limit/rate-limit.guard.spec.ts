import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SkipThrottle } from '@nestjs/throttler';

import {
  GLOBAL_LIMIT,
  GLOBAL_THROTTLER,
  SIGNUP_LIMIT,
  TOO_MANY_REQUESTS,
} from './rate-limit.constants';
import { RateLimitModule } from './rate-limit.module';
import { SignupThrottle } from './signup-throttle.decorator';

@Controller()
class TestController {
  @Get('a')
  a() {
    return 'a';
  }

  @Get('b')
  b() {
    return 'b';
  }

  @Get('health')
  @SkipThrottle({ [GLOBAL_THROTTLER]: true })
  health() {
    return 'ok';
  }

  @Post('signup-one')
  @SignupThrottle()
  signupOne() {
    return 'one';
  }

  @Post('signup-two')
  @SignupThrottle()
  signupTwo() {
    return 'two';
  }
}

describe('RateLimitGuard', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitModule],
      controllers: [TestController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  const call = (path: string, method = 'GET') => fetch(`${baseUrl}${path}`, { method });

  it('shares the global limit across routes and answers 429 with a code', async () => {
    for (let i = 0; i < GLOBAL_LIMIT.limit; i++) {
      const response = await call(i % 2 === 0 ? '/a' : '/b');
      expect(response.status).toBe(200);
    }

    const blocked = await call('/a');
    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toMatchObject({ code: TOO_MANY_REQUESTS });
  });

  it('does not limit the health check', async () => {
    for (let i = 0; i < GLOBAL_LIMIT.limit + 5; i++) {
      expect((await call('/health')).status).toBe(200);
    }
  });

  it('shares the signup limit across both signup routes', async () => {
    for (let i = 0; i < SIGNUP_LIMIT.limit; i++) {
      const response = await call(i % 2 === 0 ? '/signup-one' : '/signup-two', 'POST');
      expect(response.status).toBe(201);
    }

    expect((await call('/signup-two', 'POST')).status).toBe(429);
    expect((await call('/a')).status).toBe(200);
  });
});

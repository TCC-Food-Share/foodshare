import { hours, minutes } from '@nestjs/throttler';

export const TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS';

export const GLOBAL_THROTTLER = 'global';
export const SIGNUP_THROTTLER = 'signup';

export const GLOBAL_LIMIT = { limit: 100, ttl: minutes(1) };
export const SIGNUP_LIMIT = { limit: 5, ttl: hours(1) };

export const SIGNUP_THROTTLE_KEY = 'signupThrottle';

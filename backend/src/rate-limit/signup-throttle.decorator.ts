import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiTooManyRequestsResponse } from '@nestjs/swagger';

import { SIGNUP_THROTTLE_KEY } from './rate-limit.constants';

export function SignupThrottle() {
  return applyDecorators(
    SetMetadata(SIGNUP_THROTTLE_KEY, true),
    ApiTooManyRequestsResponse({
      description: 'Limite de cadastros por IP excedido: 5 por hora (`code: TOO_MANY_REQUESTS`).',
    }),
  );
}

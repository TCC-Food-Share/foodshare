import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import { NO_PROHIBITED_CONTENT } from '../content-moderation/no-prohibited-content.validator';
import { PROHIBITED_CONTENT } from '../content-moderation/prohibited-content';

const failedOnlyProhibitedContent = (error: ValidationError): boolean => {
  const failed = Object.keys(error.constraints ?? {});
  return failed.length === 1 && failed[0] === NO_PROHIBITED_CONTENT && !error.children?.length;
};

export class AppValidationPipe extends ValidationPipe {
  createExceptionFactory() {
    const defaultFactory = super.createExceptionFactory();
    return (errors: ValidationError[] = []): unknown => {
      if (errors.length === 0 || !errors.every(failedOnlyProhibitedContent)) {
        return defaultFactory(errors);
      }
      return new BadRequestException({
        code: PROHIBITED_CONTENT,
        message: 'Text contains prohibited content.',
        fields: errors.map((error) => error.property),
      });
    };
  }
}

import { Module } from '@nestjs/common';

import { NoProhibitedContentConstraint } from './no-prohibited-content.validator';

@Module({
  providers: [NoProhibitedContentConstraint],
})
export class ContentModerationModule {}

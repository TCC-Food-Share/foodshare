import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export const FOOD_DELETED = 'FOOD_DELETED';
export const PUBLISHED_AT_IN_FUTURE = 'PUBLISHED_AT_IN_FUTURE';

export const foodNotFound = () => new NotFoundException('Food not found.');

/** DT57: the administrator sees a soft-deleted food, but cannot edit it (RN24). */
export const foodDeleted = () =>
  new ConflictException({ code: FOOD_DELETED, message: 'Food is deleted.' });

/** DT57: the publication date may move back, never forward. */
export const publishedAtInFuture = () =>
  new BadRequestException({
    code: PUBLISHED_AT_IN_FUTURE,
    message: 'Publication date cannot be in the future.',
  });

export const nothingToUpdate = () =>
  new BadRequestException('Provide at least one field or an image.');

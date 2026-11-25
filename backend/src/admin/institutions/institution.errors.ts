import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import type { InstitutionUniqueField } from '../../institutions/institution-uniqueness.service';

export const INSTITUTION_DATA_ALREADY_REGISTERED = 'INSTITUTION_DATA_ALREADY_REGISTERED';
export const CANCELLATION_REASON_WITHOUT_DELETE = 'CANCELLATION_REASON_WITHOUT_DELETE';

/** The panel is not anonymous: unlike the public sign-up, it names every field that collided. */
export const institutionDataAlreadyRegistered = (fields: InstitutionUniqueField[]) =>
  new ConflictException({
    code: INSTITUTION_DATA_ALREADY_REGISTERED,
    message: 'Institution data already registered.',
    fields,
  });

export const cancellationReasonWithoutDelete = () =>
  new BadRequestException({
    code: CANCELLATION_REASON_WITHOUT_DELETE,
    message: 'A cancellation reason is only accepted together with deleted = true.',
  });

export const institutionNotFound = () => new NotFoundException('Institution not found.');

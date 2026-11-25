import { ConflictException, NotFoundException } from '@nestjs/common';

export const EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED';
export const CANNOT_DELETE_SELF = 'CANNOT_DELETE_SELF';
export const LAST_ADMINISTRATOR = 'LAST_ADMINISTRATOR';

export const emailAlreadyRegistered = () =>
  new ConflictException({ code: EMAIL_ALREADY_REGISTERED, message: 'Email already registered.' });

export const cannotDeleteSelf = () =>
  new ConflictException({
    code: CANNOT_DELETE_SELF,
    message: 'Administrators cannot delete their own account.',
  });

export const lastAdministrator = () =>
  new ConflictException({
    code: LAST_ADMINISTRATOR,
    message: 'At least one confirmed administrator must remain.',
  });

export const administratorNotFound = () => new NotFoundException('Administrator not found.');

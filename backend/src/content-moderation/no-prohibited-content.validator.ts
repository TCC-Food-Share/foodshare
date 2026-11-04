import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { containsLink, containsProhibitedTerm } from './prohibited-content';

export const NO_PROHIBITED_CONTENT = 'noProhibitedContent';

@Injectable()
@ValidatorConstraint({ name: NO_PROHIBITED_CONTENT, async: true })
export class NoProhibitedContentConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(value: unknown): Promise<boolean> {
    if (typeof value !== 'string') return true;
    if (containsLink(value)) return false;
    const rows = await this.prisma.prohibitedTerm.findMany({ select: { term: true } });
    return !containsProhibitedTerm(
      value,
      rows.map((row) => row.term),
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains prohibited content`;
  }
}

export function NoProhibitedContent(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options,
      validator: NoProhibitedContentConstraint,
    });
  };
}

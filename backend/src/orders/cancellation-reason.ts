import { BadRequestException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import {
  CANCELLATION_REASON_REQUIRED,
  INVALID_CANCELLATION_REASON,
} from '../foods/foods.constants';

// RN09/RN31: a cancellation by an institution needs an existing reason that is not a system one.
export async function assertSelectableReason(
  tx: Prisma.TransactionClient,
  cancellationReasonId: number | undefined,
): Promise<void> {
  if (cancellationReasonId === undefined) {
    throw new BadRequestException({
      code: CANCELLATION_REASON_REQUIRED,
      message: 'A cancellation reason is required.',
    });
  }
  const reason = await tx.cancellationReason.findUnique({ where: { id: cancellationReasonId } });
  if (!reason || reason.isSystem) {
    throw new BadRequestException({
      code: INVALID_CANCELLATION_REASON,
      message: 'Cancellation reason not found.',
    });
  }
}

import type { Prisma } from '../../generated/prisma/client';

/**
 * Identifiers the better-auth `emailOTP` plugin uses in `verification` for an e-mail's pending codes
 * (confirmation and password reset). Every flow that deletes or renames an account clears both.
 */
export const verificationIdentifiers = (email: string): string[] => {
  const normalized = email.toLowerCase();
  return [`email-verification-otp-${normalized}`, `forget-password-otp-${normalized}`];
};

export async function deleteVerificationCodes(
  client: Pick<Prisma.TransactionClient, 'verification'>,
  email: string,
): Promise<void> {
  await client.verification.deleteMany({
    where: { identifier: { in: verificationIdentifiers(email) } },
  });
}

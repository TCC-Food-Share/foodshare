import { APIError, BASE_ERROR_CODES } from 'better-auth';

interface SignInHookContext {
  path: string;
  body?: unknown;
}

interface UserLookup {
  user: {
    findUnique(args: { where: { email: string } }): Promise<{ deleted: boolean } | null>;
  };
}

export async function rejectDeletedUserOnSignIn(
  ctx: SignInHookContext,
  prisma: UserLookup,
): Promise<void> {
  if (ctx.path !== '/sign-in/email') return;

  const email = (ctx.body as { email?: string } | undefined)?.email;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (user?.deleted) {
    throw APIError.from('UNAUTHORIZED', BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD);
  }
}

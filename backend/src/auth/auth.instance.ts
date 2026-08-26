import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { openAPI } from 'better-auth/plugins';

import { PrismaClient } from '../../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const auth = betterAuth({
  secret: process.env.JWT_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/auth',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      roleId: {
        type: 'number',
        required: true,
        input: true,
      },
      personalPhone: {
        type: 'string',
        required: true,
        input: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: false,
  },
  advanced: {
    database: {
      generateId: 'serial',
    },
  },
  plugins: [openAPI({ disableDefaultReference: true })],
  disabledPaths: [
    '/sign-up/email',
    '/sign-in/social',
    '/get-session',
    '/list-sessions',
    '/revoke-session',
    '/revoke-sessions',
    '/revoke-other-sessions',
    '/update-session',
    '/get-access-token',
    '/refresh-token',
    '/account-info',
    '/list-accounts',
    '/link-social',
    '/unlink-account',
    '/callback/:id',
    '/update-user',
    '/change-email',
    '/change-password',
    '/delete-user',
    '/delete-user/callback',
    '/verify-password',
    '/verify-email',
    '/send-verification-email',
    '/request-password-reset',
    '/reset-password',
    '/reset-password/:token',
  ],
});

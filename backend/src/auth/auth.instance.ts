import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import { emailOTP, openAPI } from 'better-auth/plugins';

import { PrismaClient } from '../../generated/prisma/client';
import { createVerificationCodeSender } from '../mail/verification-code';
import { rejectDeletedUserOnSignIn } from './reject-deleted-user.hook';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;

export const auth = betterAuth({
  secret: process.env.JWT_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/auth',
  trustedOrigins,
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
        required: false,
        input: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // RN47: só entra quem confirmou o e-mail pessoal.
    requireEmailVerification: true,
    autoSignIn: false,
    // DT38: redefinir a senha encerra todas as sessões da conta.
    revokeSessionsOnPasswordReset: true,
    maxPasswordLength: 72,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Login bloqueado não envia e-mail: o reenvio passa pelo limite de 10 min.
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
  },
  // RNF11/RN33: 1 pedido de código a cada 10 minutos por IP. Só vale em
  // produção (padrão do better-auth); contadores em memória.
  rateLimit: {
    customRules: {
      '/email-otp/request-password-reset': { window: 600, max: 1 },
      '/send-verification-email': { window: 600, max: 1 },
    },
  },
  advanced: {
    database: {
      generateId: 'serial',
    },
    ...(cookieDomain ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } } : {}),
  },
  plugins: [
    openAPI({ disableDefaultReference: true }),
    // RF08 e RF75: códigos de 6 dígitos, 10 minutos, 3 tentativas (RN33, DT37).
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 3,
      disableSignUp: true,
      overrideDefaultEmailVerification: true,
      sendVerificationOTP: createVerificationCodeSender(prisma),
    }),
  ],
  hooks: {
    before: createAuthMiddleware((ctx) => rejectDeletedUserOnSignIn(ctx, prisma)),
  },
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
    '/request-password-reset',
    '/reset-password',
    '/reset-password/:token',
    // emailOTP: ficam abertas só request-password-reset, check-verification-otp,
    // reset-password e verify-email. send-verification-otp aceita qualquer tipo
    // e geraria código de recuperação fora do limite de 10 minutos.
    '/sign-in/email-otp',
    '/email-otp/send-verification-otp',
    '/forget-password/email-otp',
    '/email-otp/request-email-change',
    '/email-otp/change-email',
  ],
});

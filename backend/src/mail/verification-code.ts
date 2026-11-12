import { Logger } from '@nestjs/common';
import { Resend } from 'resend';

export type VerificationCodeType = 'forget-password' | 'email-verification';

interface UserLookup {
  user: {
    findUnique(args: {
      where: { email: string };
      select: { deleted: true };
    }): Promise<{ deleted: boolean } | null>;
  };
}

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailClient {
  send(message: EmailMessage): Promise<{ error: { message: string } | null }>;
}

export interface VerificationCodeSenderOptions {
  apiKey?: string;
  fromAddress?: string;
  isProduction?: boolean;
  client?: EmailClient;
  logger?: Pick<Logger, 'error' | 'warn'>;
}

interface Template {
  subject: string;
  intro: string;
  ignoreNote: string;
}

const TEMPLATES: Record<VerificationCodeType, Template> = {
  'forget-password': {
    subject: 'Seu código de recuperação de senha – Food Share',
    intro: 'Use o código abaixo para redefinir sua senha no Food Share.',
    ignoreNote: 'Se não foi você que pediu, ignore este e-mail. Sua senha continua a mesma.',
  },
  'email-verification': {
    subject: 'Confirme seu e-mail – Food Share',
    intro: 'Use o código abaixo para confirmar seu e-mail no Food Share.',
    ignoreNote: 'Se você não se cadastrou no Food Share, ignore este e-mail.',
  },
};

const SENDER_NAME = 'Food Share';

function isVerificationCodeType(type: string): type is VerificationCodeType {
  return type === 'forget-password' || type === 'email-verification';
}

export function buildVerificationEmail(
  type: VerificationCodeType,
  otp: string,
): Pick<EmailMessage, 'subject' | 'text' | 'html'> {
  const { subject, intro, ignoreNote } = TEMPLATES[type];
  const validity = 'O código vale por 10 minutos.';

  return {
    subject,
    text: `${intro}\n\n${otp}\n\n${validity}\n\n${ignoreNote}`,
    html: [
      '<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5">',
      `<p>${intro}</p>`,
      `<p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 24px 0">${otp}</p>`,
      `<p>${validity}</p>`,
      `<p style="color: #6b7280; font-size: 13px">${ignoreNote}</p>`,
      '</div>',
    ].join(''),
  };
}

function resendClient(apiKey: string): EmailClient {
  const resend = new Resend(apiKey);
  return { send: (message) => resend.emails.send(message) };
}

/**
 * `sendVerificationOTP` do plugin `emailOTP`. Responde na hora e entrega o
 * e-mail em segundo plano, para que a resposta tenha o mesmo tempo para conta
 * ativa, inexistente ou excluída (DT36).
 */
export function createVerificationCodeSender(
  prisma: UserLookup,
  options: VerificationCodeSenderOptions = {},
) {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY?.trim();
  const fromAddress = options.fromAddress ?? process.env.EMAIL_FROM?.trim();
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';
  const logger = options.logger ?? new Logger('VerificationCode');
  const client = options.client ?? (apiKey ? resendClient(apiKey) : undefined);

  async function deliver(email: string, otp: string, type: VerificationCodeType): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email }, select: { deleted: true } });
    if (!user || user.deleted) return;

    if (!client || !fromAddress) {
      if (isProduction) {
        logger.error(`Email not sent (${type}): RESEND_API_KEY or EMAIL_FROM is not set.`);
      } else {
        logger.warn(`Email not sent (${type}), no RESEND_API_KEY. Code for ${email}: ${otp}`);
      }
      return;
    }

    const { error } = await client.send({
      from: `${SENDER_NAME} <${fromAddress}>`,
      to: email,
      ...buildVerificationEmail(type, otp),
    });
    if (error) {
      logger.error(`Email not sent (${type}): ${error.message}`);
    }
  }

  return function sendVerificationCode(data: {
    email: string;
    otp: string;
    type: string;
  }): Promise<void> {
    const { email, otp, type } = data;
    if (!isVerificationCodeType(type)) return Promise.resolve();

    void deliver(email, otp, type).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Email not sent (${type}): ${message}`);
    });
    return Promise.resolve();
  };
}

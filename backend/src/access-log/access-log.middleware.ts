import type { NextFunction, Request, Response } from 'express';

import type { AccessLogEntry } from './access-log.service';

const EXCLUDED_PATHS = [/^\/health$/, /^\/docs(\/|$)/, /^\/openapi/, /^\/favicon\.(png|ico)$/];

export const SIGN_IN_PATH = '/auth/sign-in/email';
export const SIGN_OUT_PATH = '/auth/sign-out';

export interface AccessLogMiddlewareDeps {
  record: (entry: AccessLogEntry) => Promise<void>;
  resolveUserIdFromCookie: (cookie: string) => Promise<number | null>;
}

interface RequestWithUser extends Request {
  user?: { id?: number | string } | null;
}

function cookieFromSetCookie(setCookie: ReturnType<Response['getHeader']>): string {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [String(setCookie)] : [];
  return values.map((value) => value.split(';')[0]).join('; ');
}

function stripIpv4MappedPrefix(ip: string | undefined): string | null {
  return ip ? ip.replace(/^::ffff:/, '') : null;
}

export function createAccessLogMiddleware(deps: AccessLogMiddlewareDeps) {
  return async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const path = req.originalUrl.split('?')[0];
    if (req.method === 'OPTIONS' || EXCLUDED_PATHS.some((pattern) => pattern.test(path))) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();
    const ipAddress = stripIpv4MappedPrefix(req.ip);
    const userAgent = req.get('user-agent') ?? null;

    // Sign-out deletes the session, so its owner must be resolved before the handler runs.
    let signOutUserId: number | null = null;
    if (path === SIGN_OUT_PATH && req.headers.cookie) {
      signOutUserId = await deps.resolveUserIdFromCookie(req.headers.cookie).catch(() => null);
    }

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
      const { statusCode } = res;

      const resolveUserId = async (): Promise<number | null> => {
        if (req.user?.id !== undefined) return Number(req.user.id);
        if (signOutUserId !== null) return signOutUserId;
        if (path === SIGN_IN_PATH && statusCode === 200) {
          const cookie = cookieFromSetCookie(res.getHeader('set-cookie'));
          return cookie ? deps.resolveUserIdFromCookie(cookie) : null;
        }
        return null;
      };

      void resolveUserId()
        .catch(() => null)
        .then((userId) =>
          deps.record({
            method: req.method,
            path,
            statusCode,
            durationMs,
            ipAddress,
            userAgent,
            userId,
          }),
        );
    });

    next();
  };
}

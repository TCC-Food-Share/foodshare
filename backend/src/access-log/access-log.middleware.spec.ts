import { EventEmitter } from 'node:events';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';

import { createAccessLogMiddleware } from './access-log.middleware';
import type { AccessLogEntry } from './access-log.service';

function buildRequest(overrides: Partial<Request> & { user?: unknown } = {}): Request {
  return {
    method: 'GET',
    originalUrl: '/foods?search=arroz&page=2',
    ip: '::ffff:203.0.113.7',
    headers: {},
    get: (name: string) => (name === 'user-agent' ? 'jest-agent' : undefined),
    ...overrides,
  } as unknown as Request;
}

function buildResponse(statusCode = 200, setCookie?: string[]): Response & EventEmitter {
  const res = new EventEmitter() as Response & EventEmitter;
  res.statusCode = statusCode;
  res.getHeader = (name: string) => (name === 'set-cookie' ? setCookie : undefined);
  return res;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('access log middleware', () => {
  const record = jest.fn((_entry: AccessLogEntry) => Promise.resolve());
  const resolveUserIdFromCookie = jest.fn((_cookie: string) => Promise.resolve<number | null>(42));
  const middleware = createAccessLogMiddleware({ record, resolveUserIdFromCookie });
  const next = jest.fn();

  beforeEach(() => {
    record.mockClear();
    resolveUserIdFromCookie.mockClear();
    next.mockClear();
  });

  it('records method, path without query string, status, ip and the guard user', async () => {
    const req = buildRequest({ user: { id: '5' } } as never);
    const res = buildResponse(403);

    await middleware(req, res, next);
    res.emit('finish');
    await flush();

    expect(next).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/foods',
        statusCode: 403,
        ipAddress: '203.0.113.7',
        userAgent: 'jest-agent',
        userId: 5,
      }),
    );
  });

  it.each([
    ['OPTIONS', '/foods'],
    ['GET', '/health'],
    ['GET', '/docs'],
    ['GET', '/openapi.json'],
    ['GET', '/favicon.png'],
  ])('does not record %s %s', async (method, originalUrl) => {
    const res = buildResponse();

    await middleware(buildRequest({ method, originalUrl }), res, next);
    res.emit('finish');
    await flush();

    expect(next).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('records a request without session with no user', async () => {
    const res = buildResponse(401);

    await middleware(buildRequest(), res, next);
    res.emit('finish');
    await flush();

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, userId: null }));
    expect(resolveUserIdFromCookie).not.toHaveBeenCalled();
  });

  it('resolves the user of a successful sign-in from the issued session cookie', async () => {
    const res = buildResponse(200, ['better-auth.session_token=tok.sig; Path=/; HttpOnly']);

    await middleware(
      buildRequest({ method: 'POST', originalUrl: '/auth/sign-in/email' }),
      res,
      next,
    );
    res.emit('finish');
    await flush();

    expect(resolveUserIdFromCookie).toHaveBeenCalledWith('better-auth.session_token=tok.sig');
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
  });

  it('keeps the client ip captured at request start, even if the socket closes later', async () => {
    const req = buildRequest({ method: 'POST', originalUrl: '/auth/sign-in/email' });
    const res = buildResponse(200, ['better-auth.session_token=tok.sig']);

    await middleware(req, res, next);
    Object.assign(req, { ip: undefined });
    res.emit('finish');
    await flush();

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: '203.0.113.7' }));
  });

  it('records a rejected sign-in without user', async () => {
    const res = buildResponse(401);

    await middleware(
      buildRequest({ method: 'POST', originalUrl: '/auth/sign-in/email' }),
      res,
      next,
    );
    res.emit('finish');
    await flush();

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, userId: null }));
  });

  it('resolves the user of a sign-out before the session is deleted', async () => {
    const res = buildResponse(200);

    await middleware(
      buildRequest({
        method: 'POST',
        originalUrl: '/auth/sign-out',
        headers: { cookie: 'better-auth.session_token=tok.sig' },
      }),
      res,
      next,
    );
    expect(resolveUserIdFromCookie).toHaveBeenCalledTimes(1);
    resolveUserIdFromCookie.mockResolvedValueOnce(null);
    res.emit('finish');
    await flush();

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
  });

  it('still records when the user lookup fails', async () => {
    resolveUserIdFromCookie.mockRejectedValueOnce(new Error('db down'));
    const res = buildResponse(200, ['better-auth.session_token=tok.sig']);

    await middleware(
      buildRequest({ method: 'POST', originalUrl: '/auth/sign-in/email' }),
      res,
      next,
    );
    res.emit('finish');
    await flush();

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
  });
});

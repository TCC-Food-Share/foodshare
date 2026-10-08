import { describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { AccessLogService } from './access-log.service';

const entry = {
  method: 'GET',
  path: `/foods/${'x'.repeat(600)}`,
  statusCode: 200,
  durationMs: 12,
  ipAddress: '203.0.113.7',
  userAgent: 'u'.repeat(600),
  userId: 1,
};

describe('AccessLogService', () => {
  it('truncates path and user agent to the column sizes', async () => {
    const create = jest.fn((_args: unknown) => Promise.resolve({}));
    const service = new AccessLogService({ accessLog: { create } } as unknown as PrismaService);

    await service.record(entry);

    const { data } = create.mock.calls[0][0] as { data: { path: string; userAgent: string } };
    expect(data.path).toHaveLength(500);
    expect(data.userAgent).toHaveLength(500);
  });

  it('logs and swallows a write failure', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const service = new AccessLogService({
      accessLog: { create: () => Promise.reject(new Error('db down')) },
    } as unknown as PrismaService);

    await expect(service.record(entry)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

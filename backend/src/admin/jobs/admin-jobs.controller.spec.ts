import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  Session: () => () => undefined,
}));

import { JOB_NOT_FOUND } from '../../jobs/jobs.constants';
import { JobsService } from '../../jobs/jobs.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminJobsController } from './admin-jobs.controller';

describe('AdminJobsController', () => {
  const session = {
    user: { id: '7', name: 'Ana Admin', email: 'ana@foodshare.local' },
  } as never;
  const record = jest.fn((_tx: unknown, _entry: unknown) => Promise.resolve());
  const tx = { marker: 'tx' };
  const prisma = {
    $transaction: (fn: (client: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;
  let jobs: JobsService;
  let controller: AdminJobsController;

  beforeEach(() => {
    record.mockClear();
    jobs = new JobsService();
    controller = new AdminJobsController(jobs, { record }, prisma);
  });

  it('answers JOB_NOT_FOUND for an unknown job and writes no audit', async () => {
    await expect(controller.run(session, 'order-expiration')).rejects.toMatchObject({
      status: 404,
      response: { code: JOB_NOT_FOUND },
    });
    expect(record).not.toHaveBeenCalled();
  });

  it('runs a registered job and audits it', async () => {
    jobs.register('order-expiration', () => Promise.resolve({ affected: 3 }));

    await expect(controller.run(session, 'order-expiration')).resolves.toEqual({
      name: 'order-expiration',
      affected: 3,
    });
    expect(record).toHaveBeenCalledWith(tx, {
      administrator: { id: 7, name: 'Ana Admin', email: 'ana@foodshare.local' },
      action: 'job.run',
      entityType: 'Job',
      entityId: 'order-expiration',
      details: { affected: 3 },
    });
  });
});

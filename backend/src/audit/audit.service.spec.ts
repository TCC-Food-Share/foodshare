import { describe, expect, it, jest } from '@jest/globals';

import type { Prisma } from '../../generated/prisma/client';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const administrator = { id: 7, name: 'Ana Admin', email: 'ana@foodshare.local' };

  function txMock() {
    const create = jest.fn((_args: unknown) => Promise.resolve({}));
    return { create, tx: { auditLog: { create } } as unknown as Prisma.TransactionClient };
  }

  it('writes the audit row through the given transaction client', async () => {
    const { create, tx } = txMock();

    await new AuditService().record(tx, {
      administrator,
      action: 'category.update',
      entityType: 'Category',
      entityId: 12,
      details: { name: 'Hortifruti' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        administratorId: 7,
        action: 'category.update',
        entityType: 'Category',
        entityId: '12',
        details: {
          name: 'Hortifruti',
          administrator: { name: 'Ana Admin', email: 'ana@foodshare.local' },
        },
      },
    });
  });

  it('drops sensitive keys at any depth', async () => {
    const { create, tx } = txMock();

    await new AuditService().record(tx, {
      administrator,
      action: 'administrator.create',
      entityType: 'User',
      entityId: 9,
      details: {
        password: 'secret-1',
        user: { email: 'novo@foodshare.local', newPassword: 'secret-2', sessionToken: 'abc' },
        items: [{ apiKey: 'k', label: 'ok' }],
      },
    });

    const serialized = JSON.stringify(create.mock.calls[0][0]);
    expect(serialized).not.toMatch(/secret-1|secret-2|abc|"k"/);
    expect(serialized).toContain('novo@foodshare.local');
    expect(serialized).toContain('"label":"ok"');
  });

  it('propagates a write failure so the surrounding transaction rolls back', async () => {
    const tx = {
      auditLog: { create: () => Promise.reject(new Error('db down')) },
    } as unknown as Prisma.TransactionClient;

    await expect(
      new AuditService().record(tx, {
        administrator,
        action: 'category.delete',
        entityType: 'Category',
        entityId: 1,
      }),
    ).rejects.toThrow('db down');
  });
});

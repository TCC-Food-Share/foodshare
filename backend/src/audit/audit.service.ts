import { Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';

const SENSITIVE_KEY = /password|token|secret|otp|api_?key/i;

export interface AuditAdministrator {
  id: number;
  name: string;
  email: string;
}

export interface AuditEntry {
  administrator: AuditAdministrator;
  action: string;
  entityType: string;
  entityId: string | number;
  details?: Record<string, unknown>;
}

function stripSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, nested]) => [key, stripSensitive(nested)]),
    );
  }
  return value;
}

@Injectable()
export class AuditService {
  async record(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    const { administrator } = entry;
    const details = stripSensitive({
      ...entry.details,
      administrator: { name: administrator.name, email: administrator.email },
    }) as Prisma.InputJsonObject;

    await tx.auditLog.create({
      data: {
        administratorId: administrator.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: String(entry.entityId),
        details,
      },
    });
  }
}

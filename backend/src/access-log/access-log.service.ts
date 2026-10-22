import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface AccessLogEntry {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ipAddress: string | null;
  userAgent: string | null;
  userId: number | null;
}

function truncate(value: string | null, max: number): string | null {
  return value === null ? null : value.slice(0, max);
}

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AccessLogEntry): Promise<void> {
    try {
      await this.prisma.accessLog.create({
        data: {
          method: entry.method.slice(0, 10),
          path: entry.path.slice(0, 500),
          statusCode: entry.statusCode,
          durationMs: entry.durationMs,
          ipAddress: truncate(entry.ipAddress, 45),
          userAgent: truncate(entry.userAgent, 500),
          userId: entry.userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record access log for ${entry.method} ${entry.path}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

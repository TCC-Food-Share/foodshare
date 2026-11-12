import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { UNVERIFIED_ACCOUNT_MAX_AGE_MS, UNVERIFIED_ACCOUNTS_CLEANUP_JOB } from './jobs.constants';
import { JobResult, JobsService } from './jobs.service';

interface Candidate {
  id: number;
  email: string;
  image: string | null;
}

/**
 * RN48: apaga de vez, de hora em hora, as contas com e-mail não confirmado
 * criadas há mais de 24 horas, liberando CNPJ, e-mails e celulares.
 */
@Injectable()
export class UnverifiedAccountsCleanupService implements OnModuleInit {
  private readonly logger = new Logger(UnverifiedAccountsCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
    private readonly jobs: JobsService,
  ) {}

  onModuleInit(): void {
    this.jobs.register(UNVERIFIED_ACCOUNTS_CLEANUP_JOB, () => this.run());
  }

  @Cron(CronExpression.EVERY_HOUR, { name: UNVERIFIED_ACCOUNTS_CLEANUP_JOB })
  async scheduledRun(): Promise<void> {
    await this.run();
  }

  async run(now: Date = new Date()): Promise<JobResult> {
    const cutoff = new Date(now.getTime() - UNVERIFIED_ACCOUNT_MAX_AGE_MS);
    const candidates = await this.prisma.user.findMany({
      where: { emailVerified: false, createdAt: { lt: cutoff } },
      select: { id: true, email: true, image: true },
    });

    let affected = 0;
    for (const candidate of candidates) {
      try {
        if (!(await this.deleteAccount(candidate))) continue;
        affected++;
        // Só depois do commit (docs/MODELO-DE-DADOS.md).
        if (candidate.image) await this.storage.removeQuietly(candidate.image);
      } catch (error) {
        this.logger.error(
          `Could not delete unverified account ${candidate.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    if (affected > 0) this.logger.log(`Deleted ${affected} unverified account(s).`);
    return { affected };
  }

  private deleteAccount({ id, email }: Candidate): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Trava a linha: uma confirmação simultânea espera, e a conta
      // confirmada no meio do caminho não é apagada.
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM "user" WHERE id = ${id} AND "emailVerified" = false FOR UPDATE`;
      if (locked.length === 0) return false;

      const establishment = await tx.establishment.findUnique({
        where: { userId: id },
        select: { id: true, addressId: true },
      });
      if (establishment) {
        await tx.establishment.delete({ where: { id: establishment.id } });
        await tx.address.delete({ where: { id: establishment.addressId } });
      }

      const entity = await tx.beneficiaryEntity.findUnique({
        where: { userId: id },
        select: { id: true, addressId: true },
      });
      if (entity) {
        await tx.beneficiaryEntity.delete({ where: { id: entity.id } });
        await tx.address.delete({ where: { id: entity.addressId } });
      }

      await tx.verification.deleteMany({
        where: {
          identifier: { in: [`email-verification-otp-${email}`, `forget-password-otp-${email}`] },
        },
      });

      // Session e Account saem em cascata.
      await tx.user.delete({ where: { id } });
      return true;
    });
  }
}

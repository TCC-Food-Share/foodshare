import { Inject, Injectable, Logger } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import type { BetterAuthInstance } from '../auth/better-auth.token';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { IMAGE_FOLDER } from '../files/files.constants';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createInstitution,
  findInstitution,
  INSTITUTION_ROLE,
  type InstitutionKind,
  type InstitutionUpdateData,
  type InstitutionWithRelations,
  updateInstitution,
} from './institution-kind';
import {
  type InstitutionUniqueField,
  InstitutionUniquenessService,
  type InstitutionUniqueValues,
  touchesInstitutionalField,
} from './institution-uniqueness.service';

export interface InstitutionAddressInput {
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
}

export interface InstitutionCreateInput {
  name: string;
  email: string;
  personalPhone: string;
  password: string;
  companyName: string;
  tradeName?: string;
  cnpj: string;
  institutionalEmail: string;
  institutionalPhone: string;
  description: string;
  address: InstitutionAddressInput;
}

export interface InstitutionUpdateInput {
  tradeName?: string | null;
  name?: string;
  personalPhone?: string;
  institutionalPhone?: string;
  institutionalEmail?: string;
  description?: string;
  address?: InstitutionAddressInput;
}

export interface InstitutionChanges {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

type ConflictFactory = (fields: InstitutionUniqueField[]) => Error;

export interface RegisterOptions {
  conflict: ConflictFactory;
  inTransaction?: (
    tx: Prisma.TransactionClient,
    institution: InstitutionWithRelations,
  ) => Promise<void>;
}

export interface UpdateOptions {
  conflict: ConflictFactory;
  /** Runs in the transaction before any field is written (admin soft delete and restore). */
  beforeUpdate?: (tx: Prisma.TransactionClient, current: InstitutionWithRelations) => Promise<void>;
  afterUpdate?: (
    tx: Prisma.TransactionClient,
    changes: InstitutionChanges | null,
    updated: InstitutionWithRelations,
  ) => Promise<void>;
}

const verificationIdentifiers = (email: string) => [
  `email-verification-otp-${email}`,
  `forget-password-otp-${email}`,
];

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const sameAddress = (
  current: InstitutionWithRelations['address'],
  next: InstitutionAddressInput,
): boolean =>
  current.postalCode === next.postalCode &&
  current.street === next.street &&
  current.number === next.number &&
  (next.complement === undefined || current.complement === next.complement) &&
  current.city === next.city &&
  current.state === next.state;

const addressSnapshot = (address: InstitutionWithRelations['address']) => ({
  postalCode: address.postalCode,
  street: address.street,
  number: address.number,
  complement: address.complement,
  city: address.city,
  state: address.state,
});

@Injectable()
export class InstitutionRegistrationService {
  private readonly logger = new Logger(InstitutionRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
    private readonly storage: ImageStorageService,
    private readonly uniqueness: InstitutionUniquenessService,
  ) {}

  /** RF01, RF02 and RF41. The account starts unconfirmed and `signUpEmail` sends the code (DT39). */
  async register(
    kind: InstitutionKind,
    dto: InstitutionCreateInput,
    image: ValidatedImage,
    options: RegisterOptions,
  ): Promise<InstitutionWithRelations> {
    const values: InstitutionUniqueValues = {
      cnpj: dto.cnpj,
      institutionalEmail: dto.institutionalEmail,
      institutionalPhone: dto.institutionalPhone,
      email: dto.email,
      personalPhone: dto.personalPhone,
    };
    const conflicts = await this.uniqueness.findConflicts(this.prisma, values);
    if (conflicts.length > 0) throw options.conflict(conflicts);

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: INSTITUTION_ROLE[kind] },
    });
    const imageKey = await this.storage.store(IMAGE_FOLDER.USERS, image);

    let userId: number;
    try {
      const { user } = await this.auth.api.signUpEmail({
        body: {
          name: dto.name,
          email: dto.email,
          password: dto.password,
          personalPhone: dto.personalPhone,
          image: imageKey,
          roleId: role.id,
        },
      });
      userId = Number(user.id);
    } catch {
      await this.storage.removeQuietly(imageKey);
      throw options.conflict(await this.uniqueness.findConflicts(this.prisma, values));
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.uniqueness.lock(tx);
        const late = await this.uniqueness.findConflicts(tx, {
          cnpj: dto.cnpj,
          institutionalEmail: dto.institutionalEmail,
          institutionalPhone: dto.institutionalPhone,
        });
        if (late.length > 0) throw options.conflict(late);

        const address = await tx.address.create({
          data: {
            postalCode: dto.address.postalCode,
            street: dto.address.street,
            number: dto.address.number,
            complement: dto.address.complement,
            city: dto.address.city,
            state: dto.address.state,
          },
        });
        const institution = await createInstitution(tx, kind, {
          companyName: dto.companyName,
          tradeName: dto.tradeName,
          cnpj: dto.cnpj,
          institutionalEmail: dto.institutionalEmail,
          institutionalPhone: dto.institutionalPhone,
          description: dto.description,
          userId,
          addressId: address.id,
        });
        await options.inTransaction?.(tx, institution);
        return institution;
      });
    } catch (error) {
      await this.discardAccount(userId, dto.email);
      await this.storage.removeQuietly(imageKey);
      if (isUniqueViolation(error)) {
        throw options.conflict(await this.uniqueness.findConflicts(this.prisma, values));
      }
      throw error;
    }
  }

  /**
   * RF03, RF11 and RF44: only the fields sent. The new image is stored before the transaction and
   * the old one removed only after the commit; on failure, the new one is removed.
   */
  async update(
    kind: InstitutionKind,
    current: InstitutionWithRelations,
    dto: InstitutionUpdateInput,
    image: ValidatedImage | undefined,
    options: UpdateOptions,
  ): Promise<InstitutionWithRelations> {
    const values: InstitutionUniqueValues = {
      institutionalEmail: dto.institutionalEmail,
      institutionalPhone: dto.institutionalPhone,
      personalPhone: dto.personalPhone,
    };
    const exclude = { kind, institutionId: current.id, userId: current.userId };
    const conflicts = await this.uniqueness.findConflicts(this.prisma, values, exclude);
    if (conflicts.length > 0) throw options.conflict(conflicts);

    const newImageKey = image ? await this.storage.store(IMAGE_FOLDER.USERS, image) : undefined;

    try {
      const { updated, replacedImage } = await this.prisma.$transaction(async (tx) => {
        // Before any row lock (the admin soft delete in beforeUpdate), to keep one lock order.
        if (touchesInstitutionalField(values)) {
          await this.uniqueness.lock(tx);
          const late = await this.uniqueness.findConflicts(tx, values, exclude);
          if (late.length > 0) throw options.conflict(late);
        }

        await options.beforeUpdate?.(tx, current);

        const fresh = await findInstitution(tx, kind, { id: current.id });
        if (!fresh) throw new Error(`Institution ${current.id} vanished during update.`);

        const { changes, updated } = await this.applyUpdate(tx, kind, fresh, dto, newImageKey);
        await options.afterUpdate?.(tx, changes, updated);
        return {
          updated,
          replacedImage: newImageKey !== undefined ? fresh.user.image : null,
        };
      });

      if (replacedImage) await this.storage.removeQuietly(replacedImage);
      return updated;
    } catch (error) {
      if (newImageKey !== undefined) await this.storage.removeQuietly(newImageKey);
      if (isUniqueViolation(error)) {
        throw options.conflict(await this.uniqueness.findConflicts(this.prisma, values, exclude));
      }
      throw error;
    }
  }

  private async applyUpdate(
    tx: Prisma.TransactionClient,
    kind: InstitutionKind,
    current: InstitutionWithRelations,
    dto: InstitutionUpdateInput,
    newImageKey: string | undefined,
  ): Promise<{ changes: InstitutionChanges | null; updated: InstitutionWithRelations }> {
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const track = (field: string, previous: unknown, next: unknown) => {
      before[field] = previous;
      after[field] = next;
    };

    const userData: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined && dto.name !== current.user.name) {
      userData.name = dto.name;
      track('name', current.user.name, dto.name);
    }
    if (dto.personalPhone !== undefined && dto.personalPhone !== current.user.personalPhone) {
      userData.personalPhone = dto.personalPhone;
      track('personalPhone', current.user.personalPhone, dto.personalPhone);
    }
    if (newImageKey !== undefined) {
      userData.image = newImageKey;
      track('image', current.user.image, newImageKey);
    }

    const institutionData: InstitutionUpdateData = {};
    const institutionFields = [
      'tradeName',
      'institutionalEmail',
      'institutionalPhone',
      'description',
    ] as const;
    for (const field of institutionFields) {
      const next = dto[field];
      if (next !== undefined && next !== current[field]) {
        institutionData[field] = next as string;
        track(field, current[field], next);
      }
    }

    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: current.userId }, data: userData });
    }
    if (dto.address && !sameAddress(current.address, dto.address)) {
      const updatedAddress = await tx.address.update({
        where: { id: current.addressId },
        data: {
          postalCode: dto.address.postalCode,
          street: dto.address.street,
          number: dto.address.number,
          complement: dto.address.complement,
          city: dto.address.city,
          state: dto.address.state,
        },
      });
      track('address', addressSnapshot(current.address), addressSnapshot(updatedAddress));
    }

    const updated =
      Object.keys(institutionData).length > 0
        ? await updateInstitution(tx, kind, current.id, institutionData)
        : ((await findInstitution(tx, kind, { id: current.id })) as InstitutionWithRelations);

    const changed = Object.keys(after).length > 0;
    return { changes: changed ? { before, after } : null, updated };
  }

  private async discardAccount(userId: number, email: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id: userId } });
      await this.prisma.verification.deleteMany({
        where: { identifier: { in: verificationIdentifiers(email.toLowerCase()) } },
      });
    } catch (error) {
      this.logger.error(
        `Could not discard institution account ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

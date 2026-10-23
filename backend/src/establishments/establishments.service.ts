import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import type { BetterAuthInstance } from '../auth/better-auth.token';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { ROLE } from '../auth/roles.constants';
import { IMAGE_FOLDER } from '../files/files.constants';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { EstablishmentResponseDto } from './dto/establishment-response.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

const FIELD_LABELS: Record<string, string> = {
  cnpj: 'CNPJ',
  institutionalEmail: 'institutional email',
  institutionalPhone: 'institutional phone',
  personal: 'personal email or phone',
};

function buildDuplicateMessage(fields: string[]): string {
  const labels = fields.map((field) => FIELD_LABELS[field]);
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  const verb = labels.length === 1 ? 'is' : 'are';
  const message = `${list} ${verb} already registered.`;
  return message.charAt(0).toUpperCase() + message.slice(1);
}

@Injectable()
export class EstablishmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
    private readonly storage: ImageStorageService,
  ) {}

  async create(
    dto: CreateEstablishmentDto,
    image: ValidatedImage,
  ): Promise<EstablishmentResponseDto> {
    await this.checkUniqueness(dto);

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: ROLE.ESTABLISHMENT },
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
      throw new ConflictException('CNPJ, email or phone already registered.');
    }

    try {
      const establishment = await this.prisma.$transaction(async (tx) => {
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

        return tx.establishment.create({
          data: {
            companyName: dto.companyName,
            tradeName: dto.tradeName,
            cnpj: dto.cnpj,
            institutionalEmail: dto.institutionalEmail,
            institutionalPhone: dto.institutionalPhone,
            description: dto.description,
            userId,
            addressId: address.id,
          },
          include: { user: true, address: true },
        });
      });

      return this.toResponse(establishment);
    } catch (error) {
      await this.prisma.user.delete({ where: { id: userId } }).catch(() => {});
      await this.storage.removeQuietly(imageKey);

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('CNPJ, email or phone already registered.');
      }
      throw error;
    }
  }

  async findMe(userId: number): Promise<EstablishmentResponseDto> {
    const establishment = await this.prisma.establishment.findUnique({
      where: { userId },
      include: { user: true, address: true },
    });
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }
    return this.toResponse(establishment);
  }

  async update(
    userId: number,
    dto: UpdateEstablishmentDto,
    image?: ValidatedImage,
  ): Promise<EstablishmentResponseDto> {
    const existing = await this.prisma.establishment.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.checkUpdateUniqueness(dto, existing.id, userId);

    const newImageKey = image ? await this.storage.store(IMAGE_FOLDER.USERS, image) : undefined;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.personalPhone !== undefined || newImageKey !== undefined) {
          await tx.user.update({
            where: { id: userId },
            data: {
              ...(dto.personalPhone !== undefined && { personalPhone: dto.personalPhone }),
              ...(newImageKey !== undefined && { image: newImageKey }),
            },
          });
        }

        if (dto.address) {
          await tx.address.update({
            where: { id: existing.addressId },
            data: {
              postalCode: dto.address.postalCode,
              street: dto.address.street,
              number: dto.address.number,
              complement: dto.address.complement,
              city: dto.address.city,
              state: dto.address.state,
            },
          });
        }

        return tx.establishment.update({
          where: { id: existing.id },
          data: {
            ...(dto.institutionalPhone !== undefined && {
              institutionalPhone: dto.institutionalPhone,
            }),
            ...(dto.institutionalEmail !== undefined && {
              institutionalEmail: dto.institutionalEmail,
            }),
            ...(dto.description !== undefined && { description: dto.description }),
          },
          include: { user: true, address: true },
        });
      });

      if (newImageKey !== undefined && existing.user.image) {
        await this.storage.removeQuietly(existing.user.image);
      }

      return this.toResponse(updated);
    } catch (error) {
      if (newImageKey !== undefined) {
        await this.storage.removeQuietly(newImageKey);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('CNPJ, email or phone already registered.');
      }
      throw error;
    }
  }

  private async checkUpdateUniqueness(
    dto: UpdateEstablishmentDto,
    establishmentId: number,
    userId: number,
  ): Promise<void> {
    const [userByPhone, establishmentByEmail, establishmentByPhone] = await Promise.all([
      dto.personalPhone !== undefined
        ? this.prisma.user.findFirst({
            where: { personalPhone: dto.personalPhone, NOT: { id: userId } },
          })
        : null,
      dto.institutionalEmail !== undefined
        ? this.prisma.establishment.findFirst({
            where: { institutionalEmail: dto.institutionalEmail, NOT: { id: establishmentId } },
          })
        : null,
      dto.institutionalPhone !== undefined
        ? this.prisma.establishment.findFirst({
            where: { institutionalPhone: dto.institutionalPhone, NOT: { id: establishmentId } },
          })
        : null,
    ]);

    const duplicateFields: string[] = [];
    if (establishmentByEmail) duplicateFields.push('institutionalEmail');
    if (establishmentByPhone) duplicateFields.push('institutionalPhone');
    if (userByPhone) duplicateFields.push('personal');

    if (duplicateFields.length > 0) {
      throw new ConflictException({
        message: buildDuplicateMessage(duplicateFields),
        fields: duplicateFields,
      });
    }
  }

  private async checkUniqueness(dto: CreateEstablishmentDto): Promise<void> {
    const [
      userByEmail,
      userByPhone,
      establishmentByCnpj,
      establishmentByEmail,
      establishmentByPhone,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { personalPhone: dto.personalPhone } }),
      this.prisma.establishment.findUnique({ where: { cnpj: dto.cnpj } }),
      this.prisma.establishment.findUnique({
        where: { institutionalEmail: dto.institutionalEmail },
      }),
      this.prisma.establishment.findUnique({
        where: { institutionalPhone: dto.institutionalPhone },
      }),
    ]);

    const duplicateFields: string[] = [];
    if (establishmentByCnpj) duplicateFields.push('cnpj');
    if (establishmentByEmail) duplicateFields.push('institutionalEmail');
    if (establishmentByPhone) duplicateFields.push('institutionalPhone');
    if (userByEmail || userByPhone) duplicateFields.push('personal');

    if (duplicateFields.length > 0) {
      throw new ConflictException({
        message: buildDuplicateMessage(duplicateFields),
        fields: duplicateFields,
      });
    }
  }

  private toResponse(
    establishment: Prisma.EstablishmentGetPayload<{
      include: { user: true; address: true };
    }>,
  ): EstablishmentResponseDto {
    return {
      id: establishment.id,
      companyName: establishment.companyName,
      tradeName: establishment.tradeName,
      cnpj: establishment.cnpj,
      institutionalEmail: establishment.institutionalEmail,
      institutionalPhone: establishment.institutionalPhone,
      description: establishment.description,
      user: {
        id: establishment.user.id,
        name: establishment.user.name,
        email: establishment.user.email,
        personalPhone: establishment.user.personalPhone ?? '',
        image: this.storage.toUrl(establishment.user.image),
      },
      address: {
        id: establishment.address.id,
        postalCode: establishment.address.postalCode,
        street: establishment.address.street,
        number: establishment.address.number,
        complement: establishment.address.complement,
        city: establishment.address.city,
        state: establishment.address.state,
      },
    };
  }
}

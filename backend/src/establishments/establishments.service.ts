import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import {
  INSTITUTION_PUBLIC_SELECT,
  INSTITUTION_PUBLIC_WHERE,
  listPublicInstitutions,
  toPublicProfile,
} from '../common/institution-public';
import type {
  InstitutionPublicProfileDto,
  PaginatedInstitutionsResponseDto,
} from '../common/institution-public.dto';
import type { ListInstitutionsQueryDto } from '../common/list-institutions-query.dto';
import type { ValidatedImage } from '../files/image-file.pipe';
import { ImageStorageService } from '../files/image-storage.service';
import { findInstitution, INSTITUTION_KIND } from '../institutions/institution-kind';
import { InstitutionRegistrationService } from '../institutions/institution-registration.service';
import { publicDuplicateConflict } from '../institutions/institution-uniqueness.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { EstablishmentResponseDto } from './dto/establishment-response.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

@Injectable()
export class EstablishmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
    private readonly registration: InstitutionRegistrationService,
  ) {}

  async create(
    dto: CreateEstablishmentDto,
    image: ValidatedImage,
  ): Promise<EstablishmentResponseDto> {
    const created = await this.registration.register(INSTITUTION_KIND.ESTABLISHMENT, dto, image, {
      conflict: publicDuplicateConflict,
    });
    return this.toResponse(created);
  }

  listPublic(query: ListInstitutionsQueryDto): Promise<PaginatedInstitutionsResponseDto> {
    return listPublicInstitutions(
      this.prisma,
      'establishment',
      query,
      (ids) =>
        this.prisma.establishment.findMany({
          where: { id: { in: ids } },
          select: INSTITUTION_PUBLIC_SELECT,
        }),
      (key) => this.storage.toUrl(key),
    );
  }

  async findPublic(id: number): Promise<InstitutionPublicProfileDto> {
    const row = await this.prisma.establishment.findFirst({
      where: { id, ...INSTITUTION_PUBLIC_WHERE },
      select: INSTITUTION_PUBLIC_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Institution not found.');
    }
    return toPublicProfile(row, (key) => this.storage.toUrl(key));
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
    const existing = await findInstitution(this.prisma, INSTITUTION_KIND.ESTABLISHMENT, { userId });
    if (!existing) {
      throw new NotFoundException('Establishment not found.');
    }

    const updated = await this.registration.update(
      INSTITUTION_KIND.ESTABLISHMENT,
      existing,
      dto,
      image,
      {
        conflict: publicDuplicateConflict,
      },
    );
    return this.toResponse(updated);
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

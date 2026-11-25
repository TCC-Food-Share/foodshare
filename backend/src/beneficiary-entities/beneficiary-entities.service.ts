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
import { BeneficiaryEntityResponseDto } from './dto/beneficiary-entity-response.dto';
import { CreateBeneficiaryEntityDto } from './dto/create-beneficiary-entity.dto';
import { UpdateBeneficiaryEntityDto } from './dto/update-beneficiary-entity.dto';

@Injectable()
export class BeneficiaryEntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
    private readonly registration: InstitutionRegistrationService,
  ) {}

  async create(
    dto: CreateBeneficiaryEntityDto,
    image: ValidatedImage,
  ): Promise<BeneficiaryEntityResponseDto> {
    const created = await this.registration.register(
      INSTITUTION_KIND.BENEFICIARY_ENTITY,
      dto,
      image,
      {
        conflict: publicDuplicateConflict,
      },
    );
    return this.toResponse(created);
  }

  listPublic(query: ListInstitutionsQueryDto): Promise<PaginatedInstitutionsResponseDto> {
    return listPublicInstitutions(
      this.prisma,
      'beneficiary_entity',
      query,
      (ids) =>
        this.prisma.beneficiaryEntity.findMany({
          where: { id: { in: ids } },
          select: INSTITUTION_PUBLIC_SELECT,
        }),
      (key) => this.storage.toUrl(key),
    );
  }

  async findPublic(id: number): Promise<InstitutionPublicProfileDto> {
    const row = await this.prisma.beneficiaryEntity.findFirst({
      where: { id, ...INSTITUTION_PUBLIC_WHERE },
      select: INSTITUTION_PUBLIC_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Institution not found.');
    }
    return toPublicProfile(row, (key) => this.storage.toUrl(key));
  }
  async findMe(userId: number): Promise<BeneficiaryEntityResponseDto> {
    const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({
      where: { userId },
      include: { user: true, address: true },
    });
    if (!beneficiaryEntity) {
      throw new NotFoundException('Beneficiary entity not found.');
    }
    return this.toResponse(beneficiaryEntity);
  }

  async update(
    userId: number,
    dto: UpdateBeneficiaryEntityDto,
    image?: ValidatedImage,
  ): Promise<BeneficiaryEntityResponseDto> {
    const existing = await findInstitution(this.prisma, INSTITUTION_KIND.BENEFICIARY_ENTITY, {
      userId,
    });
    if (!existing) {
      throw new NotFoundException('Beneficiary entity not found.');
    }

    const updated = await this.registration.update(
      INSTITUTION_KIND.BENEFICIARY_ENTITY,
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
    beneficiaryEntity: Prisma.BeneficiaryEntityGetPayload<{
      include: { user: true; address: true };
    }>,
  ): BeneficiaryEntityResponseDto {
    return {
      id: beneficiaryEntity.id,
      companyName: beneficiaryEntity.companyName,
      tradeName: beneficiaryEntity.tradeName,
      cnpj: beneficiaryEntity.cnpj,
      institutionalEmail: beneficiaryEntity.institutionalEmail,
      institutionalPhone: beneficiaryEntity.institutionalPhone,
      description: beneficiaryEntity.description,
      user: {
        id: beneficiaryEntity.user.id,
        name: beneficiaryEntity.user.name,
        email: beneficiaryEntity.user.email,
        personalPhone: beneficiaryEntity.user.personalPhone ?? '',
        image: this.storage.toUrl(beneficiaryEntity.user.image),
      },
      address: {
        id: beneficiaryEntity.address.id,
        postalCode: beneficiaryEntity.address.postalCode,
        street: beneficiaryEntity.address.street,
        number: beneficiaryEntity.address.number,
        complement: beneficiaryEntity.address.complement,
        city: beneficiaryEntity.address.city,
        state: beneficiaryEntity.address.state,
      },
    };
  }
}

import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import type { BetterAuthInstance } from '../auth/better-auth.token';
import { BETTER_AUTH } from '../auth/better-auth.token';
import { PrismaService } from '../prisma/prisma.service';
import { BeneficiaryEntityResponseDto } from './dto/beneficiary-entity-response.dto';
import { CreateBeneficiaryEntityDto } from './dto/create-beneficiary-entity.dto';

const ROLE_BENEFICIARY_ENTITY = 'BeneficiaryEntity';

const FIELD_LABELS: Record<string, string> = {
  cnpj: 'CNPJ',
  institutionalEmail: 'institutional email',
  institutionalPhone: 'institutional phone',
  email: 'personal email',
  personalPhone: 'personal phone',
};

function buildDuplicateMessage(fields: string[]): string {
  const labels = fields.map((field) => FIELD_LABELS[field]);
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  const verb = labels.length === 1 ? 'is' : 'are';
  return `${list} ${verb} already registered.`;
}

@Injectable()
export class BeneficiaryEntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
  ) {}

  async create(dto: CreateBeneficiaryEntityDto): Promise<BeneficiaryEntityResponseDto> {
    await this.checkUniqueness(dto);

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: ROLE_BENEFICIARY_ENTITY },
    });

    let userId: number;
    try {
      const { user } = await this.auth.api.signUpEmail({
        body: {
          name: dto.name,
          email: dto.email,
          password: dto.password,
          personalPhone: dto.personalPhone,
          roleId: role.id,
        },
      });
      userId = Number(user.id);
    } catch {
      throw new ConflictException('CNPJ, email or phone already registered.');
    }

    try {
      const beneficiaryEntity = await this.prisma.$transaction(async (tx) => {
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

        return tx.beneficiaryEntity.create({
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

      return this.toResponse(beneficiaryEntity);
    } catch (error) {
      await this.prisma.user.delete({ where: { id: userId } }).catch(() => {});

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('CNPJ, email or phone already registered.');
      }
      throw error;
    }
  }

  private async checkUniqueness(dto: CreateBeneficiaryEntityDto): Promise<void> {
    const [userByEmail, userByPhone, entityByCnpj, entityByEmail, entityByPhone] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { email: dto.email } }),
        this.prisma.user.findUnique({ where: { personalPhone: dto.personalPhone } }),
        this.prisma.beneficiaryEntity.findUnique({ where: { cnpj: dto.cnpj } }),
        this.prisma.beneficiaryEntity.findUnique({
          where: { institutionalEmail: dto.institutionalEmail },
        }),
        this.prisma.beneficiaryEntity.findUnique({
          where: { institutionalPhone: dto.institutionalPhone },
        }),
      ]);

    const duplicateFields: string[] = [];
    if (userByEmail) duplicateFields.push('email');
    if (userByPhone) duplicateFields.push('personalPhone');
    if (entityByCnpj) duplicateFields.push('cnpj');
    if (entityByEmail) duplicateFields.push('institutionalEmail');
    if (entityByPhone) duplicateFields.push('institutionalPhone');

    if (duplicateFields.length > 0) {
      throw new ConflictException({
        message: buildDuplicateMessage(duplicateFields),
        fields: duplicateFields,
      });
    }
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
        personalPhone: beneficiaryEntity.user.personalPhone,
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

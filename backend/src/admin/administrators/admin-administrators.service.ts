import { Inject, Injectable, Logger } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { type AuditAdministrator, AuditService } from '../../audit/audit.service';
import type { BetterAuthInstance } from '../../auth/better-auth.token';
import { BETTER_AUTH } from '../../auth/better-auth.token';
import { ROLE } from '../../auth/roles.constants';
import { IMAGE_FOLDER } from '../../files/files.constants';
import type { ValidatedImage } from '../../files/image-file.pipe';
import { ImageStorageService } from '../../files/image-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { type Paginated, paginateInMemory } from '../lists/common/paginate-in-memory';
import type {
  AdministratorDto,
  CreateAdministratorDto,
  ListAdministratorsQueryDto,
  UpdateAdministratorDto,
} from './administrator.dto';
import {
  administratorNotFound,
  cannotDeleteSelf,
  emailAlreadyRegistered,
  lastAdministrator,
} from './administrator.errors';

const ENTITY_TYPE = 'User';

const ADMINISTRATOR_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  emailVerified: true,
} satisfies Prisma.UserSelect;

type AdministratorRow = Prisma.UserGetPayload<{ select: typeof ADMINISTRATOR_SELECT }>;

type Client = PrismaService | Prisma.TransactionClient;

const ADMINISTRATOR_WHERE = { role: { name: ROLE.ADMINISTRATOR } } satisfies Prisma.UserWhereInput;

/** Códigos pendentes do e-mail (confirmação e recuperação), como na tarefa da RN48. */
const verificationIdentifiers = (email: string) => [
  `email-verification-otp-${email}`,
  `forget-password-otp-${email}`,
];

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

@Injectable()
export class AdminAdministratorsService {
  private readonly logger = new Logger(AdminAdministratorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
    private readonly storage: ImageStorageService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListAdministratorsQueryDto): Promise<Paginated<AdministratorDto>> {
    const rows = await this.prisma.user.findMany({
      where: ADMINISTRATOR_WHERE,
      select: ADMINISTRATOR_SELECT,
    });
    return paginateInMemory(
      rows.map((row) => this.toDto(row)),
      query,
      {
        searchText: (item) => [item.name, item.email],
        sortValues: {
          id: (item) => item.id,
          name: (item) => item.name,
          email: (item) => item.email,
        },
      },
    );
  }

  /** RF29. A conta nasce não confirmada e o `signUpEmail` já envia o código (DT39). */
  async create(
    actor: AuditAdministrator,
    dto: CreateAdministratorDto,
    image: ValidatedImage,
  ): Promise<AdministratorDto> {
    // O caso comum de e-mail repetido não chega a gravar a imagem.
    if (await this.emailTaken(this.prisma, dto.email)) throw emailAlreadyRegistered();

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: ROLE.ADMINISTRATOR },
    });
    const imageKey = await this.storage.store(IMAGE_FOLDER.USERS, image);

    let userId: number;
    try {
      const { user } = await this.auth.api.signUpEmail({
        body: {
          name: dto.name,
          email: dto.email,
          password: dto.password,
          image: imageKey,
          roleId: role.id,
        },
      });
      userId = Number(user.id);
    } catch (error) {
      await this.storage.removeQuietly(imageKey);
      // E-mail cadastrado entre a conferência e o signUp.
      if (await this.emailTaken(this.prisma, dto.email)) throw emailAlreadyRegistered();
      throw error;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: ADMINISTRATOR_SELECT,
        });
        await this.audit.record(tx, {
          administrator: actor,
          action: 'administrator.create',
          entityType: ENTITY_TYPE,
          entityId: created.id,
          details: { name: created.name, email: created.email },
        });
        return this.toDto(created);
      });
    } catch (error) {
      // Sem auditoria, a conta não pode ficar (RN46): desfaz o signUp.
      await this.discardAccount(userId, dto.email);
      await this.storage.removeQuietly(imageKey);
      throw error;
    }
  }

  /** RF30: só os campos enviados. Trocar o e-mail vale na hora, sem nova confirmação (DT47). */
  async update(
    actor: AuditAdministrator,
    id: number,
    dto: UpdateAdministratorDto,
    image?: ValidatedImage,
  ): Promise<AdministratorDto> {
    const newImageKey = image ? await this.storage.store(IMAGE_FOLDER.USERS, image) : undefined;

    try {
      const { result, replacedImage } = await this.prisma.$transaction(async (tx) => {
        const current = await this.findAdministrator(tx, id);

        const data: Prisma.UserUpdateInput = {};
        const before: Record<string, unknown> = {};
        const after: Record<string, unknown> = {};

        if (dto.name !== undefined && dto.name !== current.name) {
          data.name = dto.name;
          before.name = current.name;
          after.name = dto.name;
        }
        const emailChanged = dto.email !== undefined && dto.email !== current.email;
        if (emailChanged) {
          if (await this.emailTaken(tx, dto.email!, id)) throw emailAlreadyRegistered();
          data.email = dto.email;
          before.email = current.email;
          after.email = dto.email;
        }
        if (newImageKey !== undefined) {
          data.image = newImageKey;
          before.image = current.image;
          after.image = newImageKey;
        }

        if (Object.keys(data).length === 0) {
          return { result: this.toDto(current), replacedImage: null };
        }

        const updated = await tx.user.update({
          where: { id },
          data,
          select: ADMINISTRATOR_SELECT,
        });
        if (emailChanged) {
          await tx.verification.deleteMany({
            where: { identifier: { in: verificationIdentifiers(current.email) } },
          });
        }
        await this.audit.record(tx, {
          administrator: actor,
          action: 'administrator.update',
          entityType: ENTITY_TYPE,
          entityId: id,
          details: { before, after },
        });

        return {
          result: this.toDto(updated),
          replacedImage: newImageKey !== undefined ? current.image : null,
        };
      });

      // Só depois do commit (docs/MODELO-DE-DADOS.md).
      if (replacedImage) await this.storage.removeQuietly(replacedImage);
      return result;
    } catch (error) {
      if (newImageKey !== undefined) await this.storage.removeQuietly(newImageKey);
      if (isUniqueViolation(error)) throw emailAlreadyRegistered();
      throw error;
    }
  }

  /** RF31 + RN34 + DT46. */
  async remove(actor: AuditAdministrator, id: number): Promise<void> {
    if (id === actor.id) throw cannotDeleteSelf();

    const image = await this.prisma.$transaction(async (tx) => {
      // Trava todos os administradores na mesma ordem: exclusões simultâneas
      // esperam umas pelas outras e contam o que sobrou de verdade.
      const administrators = await tx.$queryRaw<AdministratorRow[]>`
        SELECT u.id, u.name, u.email, u.image, u."emailVerified"
          FROM "user" u
          JOIN role r ON r.id = u."roleId"
         WHERE r.name = ${ROLE.ADMINISTRATOR}
         ORDER BY u.id
           FOR UPDATE OF u`;

      const target = administrators.find((administrator) => administrator.id === id);
      if (!target) throw administratorNotFound();

      const remaining = administrators.filter(
        (administrator) => administrator.id !== id && administrator.emailVerified,
      );
      if (remaining.length === 0) throw lastAdministrator();

      await tx.verification.deleteMany({
        where: { identifier: { in: verificationIdentifiers(target.email) } },
      });
      // Session e Account saem em cascata; auditoria, acessos e listas ficam com SetNull.
      await tx.user.delete({ where: { id } });
      await this.audit.record(tx, {
        administrator: actor,
        action: 'administrator.delete',
        entityType: ENTITY_TYPE,
        entityId: id,
        details: { name: target.name, email: target.email },
      });
      return target.image;
    });

    if (image) await this.storage.removeQuietly(image);
  }

  private async findAdministrator(client: Client, id: number): Promise<AdministratorRow> {
    const administrator = await client.user.findFirst({
      where: { id, ...ADMINISTRATOR_WHERE },
      select: ADMINISTRATOR_SELECT,
    });
    if (!administrator) throw administratorNotFound();
    return administrator;
  }

  private async emailTaken(client: Client, email: string, exceptId?: number): Promise<boolean> {
    const existing = await client.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        ...(exceptId !== undefined && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    return existing !== null;
  }

  private async discardAccount(userId: number, email: string): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.verification.deleteMany({
          where: { identifier: { in: verificationIdentifiers(email) } },
        }),
        this.prisma.user.delete({ where: { id: userId } }),
      ]);
    } catch (error) {
      this.logger.error(
        `Could not discard administrator account ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private toDto(row: AdministratorRow): AdministratorDto {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      image: this.storage.toUrl(row.image),
      emailVerified: row.emailVerified,
    };
  }
}

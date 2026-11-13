import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type {
  InstitutionListItemDto,
  InstitutionPublicProfileDto,
  PaginatedInstitutionsResponseDto,
} from './institution-public.dto';
import type { ListInstitutionsQueryDto } from './list-institutions-query.dto';
import { DEFAULT_PAGE_SIZE } from './pagination';

export type InstitutionTable = 'establishment' | 'beneficiary_entity';

export const INSTITUTION_PUBLIC_WHERE = {
  deleted: false,
  user: { emailVerified: true },
} as const;

export const INSTITUTION_PUBLIC_SELECT = {
  id: true,
  tradeName: true,
  companyName: true,
  description: true,
  user: { select: { image: true } },
  address: { select: { city: true, state: true } },
} as const;

export interface PublicInstitutionRow {
  id: number;
  tradeName: string | null;
  companyName: string;
  description: string;
  user: { image: string | null };
  address: { city: string; state: string };
}

type ToUrl = (key: string | null | undefined) => string | null;

const CNPJ_TERM = /^[\d./-]+$/;

export function publicName(tradeName: string | null, companyName: string): string {
  return tradeName?.trim() || companyName;
}

export function toPublicListItem(row: PublicInstitutionRow, toUrl: ToUrl): InstitutionListItemDto {
  return {
    id: row.id,
    name: publicName(row.tradeName, row.companyName),
    image: toUrl(row.user.image),
    city: row.address.city,
    state: row.address.state,
  };
}

export function toPublicProfile(
  row: PublicInstitutionRow,
  toUrl: ToUrl,
): InstitutionPublicProfileDto {
  return { ...toPublicListItem(row, toUrl), description: row.description };
}

export function buildPublicInstitutionsFrom(
  table: InstitutionTable,
  query: ListInstitutionsQueryDto,
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`i.deleted = false`,
    Prisma.sql`u."emailVerified" = true`,
  ];

  if (query.search) {
    const term = query.search;
    const textMatch = [
      Prisma.sql`unaccent(COALESCE(i."tradeName", '')) ILIKE '%' || unaccent(${term}) || '%'`,
      Prisma.sql`unaccent(i."companyName") ILIKE '%' || unaccent(${term}) || '%'`,
      Prisma.sql`unaccent(i.description) ILIKE '%' || unaccent(${term}) || '%'`,
    ];
    const digits = term.replace(/\D/g, '');
    if (CNPJ_TERM.test(term) && digits !== '') {
      textMatch.push(
        Prisma.sql`regexp_replace(i.cnpj, '[^0-9]', '', 'g') LIKE '%' || ${digits} || '%'`,
      );
    }
    conditions.push(Prisma.sql`(${Prisma.join(textMatch, ' OR ')})`);
  }
  if (query.city) {
    conditions.push(Prisma.sql`unaccent(a.city) ILIKE '%' || unaccent(${query.city}) || '%'`);
  }
  if (query.state) {
    conditions.push(Prisma.sql`a.state = ${query.state}`);
  }

  return Prisma.sql`
    FROM ${Prisma.raw(table)} i
    JOIN "user" u ON u.id = i."userId"
    JOIN address a ON a.id = i."addressId"
    WHERE ${Prisma.join(conditions, ' AND ')}
  `;
}

export async function listPublicInstitutions(
  prisma: PrismaService,
  table: InstitutionTable,
  query: ListInstitutionsQueryDto,
  hydrate: (ids: number[]) => Promise<PublicInstitutionRow[]>,
  toUrl: ToUrl,
): Promise<PaginatedInstitutionsResponseDto> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = buildPublicInstitutionsFrom(table, query);

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT i.id ${from}
      ORDER BY lower(unaccent(COALESCE(NULLIF(i."tradeName", ''), i."companyName"))), i.id
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT count(*) AS count ${from}`),
  ]);

  const ids = idRows.map((row) => row.id);
  const rows = ids.length === 0 ? [] : await hydrate(ids);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const data = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toPublicListItem(row, toUrl)] : [];
  });

  return { data, total: Number(countRows[0]?.count ?? 0), page, pageSize };
}

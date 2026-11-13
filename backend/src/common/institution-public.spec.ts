import { describe, expect, it, jest } from '@jest/globals';

import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import {
  buildPublicInstitutionsFrom,
  listPublicInstitutions,
  publicName,
} from './institution-public';

const sqlText = (sql: Prisma.Sql): string => sql.strings.join(' ');

describe('publicName', () => {
  it('uses the trade name when present', () => {
    expect(publicName('Good Taste', 'Good Taste Ltd')).toBe('Good Taste');
  });

  it.each([null, '', '   '])('falls back to the company name for %p', (tradeName) => {
    expect(publicName(tradeName, 'Good Taste Ltd')).toBe('Good Taste Ltd');
  });
});

describe('buildPublicInstitutionsFrom', () => {
  it('reads the requested table with the public filter', () => {
    const text = sqlText(buildPublicInstitutionsFrom('beneficiary_entity', {}));

    expect(text).toContain('FROM beneficiary_entity i');
    expect(text).toContain('i.deleted = false');
    expect(text).toContain('u."emailVerified" = true');
    expect(text).not.toContain('ILIKE');
  });

  it('matches the search against trade name, company name and description', () => {
    const sql = buildPublicInstitutionsFrom('establishment', { search: 'padaria' });
    const text = sqlText(sql);

    expect(text).toContain('unaccent(COALESCE(i."tradeName", \'\')) ILIKE');
    expect(text).toContain('unaccent(i."companyName") ILIKE');
    expect(text).toContain('unaccent(i.description) ILIKE');
    expect(text).not.toContain('i.cnpj');
    expect(sql.values).toEqual(['padaria', 'padaria', 'padaria']);
  });

  it.each(['12.345.678', '12345678', '12.345.678/0001-90'])(
    'also compares the CNPJ digits for "%s"',
    (search) => {
      const sql = buildPublicInstitutionsFrom('establishment', { search });

      expect(sqlText(sql)).toContain("regexp_replace(i.cnpj, '[^0-9]', '', 'g') LIKE");
      expect(sql.values.at(-1)).toBe(search.replace(/\D/g, ''));
    },
  );

  it.each(['Padaria 2', '...', '-'])('does not compare the CNPJ for "%s"', (search) => {
    expect(sqlText(buildPublicInstitutionsFrom('establishment', { search }))).not.toContain(
      'i.cnpj',
    );
  });

  it('combines city and state with the search', () => {
    const sql = buildPublicInstitutionsFrom('establishment', {
      search: 'padaria',
      city: 'birigui',
      state: 'SP',
    });
    const text = sqlText(sql);

    expect(text).toContain('unaccent(a.city) ILIKE');
    expect(text).toContain('a.state =');
    expect(sql.values.slice(-2)).toEqual(['birigui', 'SP']);
  });
});

describe('listPublicInstitutions', () => {
  it('orders by the public name, without case or accents, then by id', async () => {
    const queryRaw = jest.fn<(sql: Prisma.Sql) => Promise<unknown>>((sql) =>
      Promise.resolve(sqlText(sql).includes('count(*)') ? [{ count: BigInt(0) }] : []),
    );
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;

    await listPublicInstitutions(
      prisma,
      'establishment',
      {},
      () => Promise.resolve([]),
      () => null,
    );

    const idQuery = queryRaw.mock.calls
      .map((call) => call[0])
      .find((sql) => !sqlText(sql).includes('count(*)'))!;
    expect(sqlText(idQuery)).toContain(
      'ORDER BY lower(unaccent(COALESCE(NULLIF(i."tradeName", \'\'), i."companyName"))), i.id',
    );
  });
});

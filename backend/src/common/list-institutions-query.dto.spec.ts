import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListInstitutionsQueryDto } from './list-institutions-query.dto';

async function parse(query: Record<string, unknown>) {
  const dto = plainToInstance(ListInstitutionsQueryDto, query);
  const errors = await validate(dto);
  return { dto, properties: errors.map((error) => error.property) };
}

describe('ListInstitutionsQueryDto', () => {
  it('accepts an empty query', async () => {
    expect((await parse({})).properties).toEqual([]);
  });

  it.each(['10', '20', '50', '100'])('accepts pageSize %s', async (pageSize) => {
    expect((await parse({ pageSize })).properties).toEqual([]);
  });

  it.each(['15', '0', 'abc'])('rejects pageSize %s', async (pageSize) => {
    expect((await parse({ pageSize })).properties).toEqual(['pageSize']);
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects page %s', async (page) => {
    expect((await parse({ page })).properties).toEqual(['page']);
  });

  it('trims search and city', async () => {
    const { dto, properties } = await parse({ search: '  padaria ', city: ' birigui ' });

    expect(properties).toEqual([]);
    expect(dto.search).toBe('padaria');
    expect(dto.city).toBe('birigui');
  });

  it('treats a blank search as absent', async () => {
    const { dto, properties } = await parse({ search: '   ' });

    expect(properties).toEqual([]);
    expect(dto.search).toBeUndefined();
  });

  it('rejects a search longer than 200 characters', async () => {
    expect((await parse({ search: 'a'.repeat(201) })).properties).toEqual(['search']);
    expect((await parse({ search: 'a'.repeat(200) })).properties).toEqual([]);
  });

  it('normalizes state to upper case', async () => {
    const { dto, properties } = await parse({ state: ' sp ' });

    expect(properties).toEqual([]);
    expect(dto.state).toBe('SP');
  });

  it('treats a blank state as absent', async () => {
    const { dto, properties } = await parse({ state: '  ' });

    expect(properties).toEqual([]);
    expect(dto.state).toBeUndefined();
  });

  it.each(['SPX', 'S', '12'])('rejects state %s', async (state) => {
    expect((await parse({ state })).properties).toEqual(['state']);
  });
});

import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CatalogSearchQueryDto } from './catalog-search-query.dto';

describe('CatalogSearchQueryDto', () => {
  it('treats a whitespace-only search as absent', () => {
    const dto = plainToInstance(CatalogSearchQueryDto, { search: '   ' });

    expect(dto.search).toBeUndefined();
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects a search longer than 100 characters', () => {
    const dto = plainToInstance(CatalogSearchQueryDto, { search: 'a'.repeat(101) });

    expect(validateSync(dto)).not.toHaveLength(0);
  });
});

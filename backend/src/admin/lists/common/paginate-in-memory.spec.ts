import { describe, expect, it } from '@jest/globals';

import { paginateInMemory } from './paginate-in-memory';

const items = [
  { id: 1, name: 'Pão francês', category: 'Pães e Massas' },
  { id: 2, name: 'Arroz branco', category: 'Não Perecíveis' },
  { id: 3, name: 'Queijo muçarela', category: 'Laticínios' },
  { id: 13, name: 'Pão de forma', category: 'Pães e Massas' },
];

const options = {
  searchText: (item: (typeof items)[number]) => [item.name, item.category],
  sortValues: {
    id: (item: (typeof items)[number]) => item.id,
    name: (item: (typeof items)[number]) => item.name,
  },
};

describe('paginateInMemory', () => {
  it('orders by id ascending by default', () => {
    const result = paginateInMemory(items, {}, options);

    expect(result.data.map((item) => item.id)).toEqual([1, 2, 3, 13]);
    expect(result).toMatchObject({ total: 4, page: 1, pageSize: 10 });
  });

  it('searches text ignoring accents and case', () => {
    const result = paginateInMemory(items, { search: 'PAO' }, options);

    expect(result.data.map((item) => item.id)).toEqual([1, 13]);
    expect(result.total).toBe(2);
  });

  it('searches secondary fields', () => {
    const result = paginateInMemory(items, { search: 'laticinios' }, options);

    expect(result.data.map((item) => item.id)).toEqual([3]);
  });

  it('matches the exact id when the term is numeric', () => {
    const result = paginateInMemory(items, { search: '3' }, options);

    expect(result.data.map((item) => item.id)).toEqual([3]);
  });

  it('sorts by name descending with pt-BR collation', () => {
    const result = paginateInMemory(items, { sort: 'name', order: 'desc' }, options);

    expect(result.data.map((item) => item.name)).toEqual([
      'Queijo muçarela',
      'Pão francês',
      'Pão de forma',
      'Arroz branco',
    ]);
  });

  it('slices the requested page and keeps the filtered total', () => {
    const result = paginateInMemory(items, { page: 2, pageSize: 3 }, options);

    expect(result.data.map((item) => item.id)).toEqual([13]);
    expect(result).toMatchObject({ total: 4, page: 2, pageSize: 3 });
  });
});

import { normalizeText } from '../../../common/normalize-text';
import { DEFAULT_PAGE_SIZE } from '../../../common/pagination';
import type { AdminListQuery } from './admin-list-query.dto';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

type SortValue = string | number | boolean;

export interface PaginateOptions<T> {
  searchText: (item: T) => string[];
  sortValues: Record<string, (item: T) => SortValue>;
}

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'pt-BR');
  return Number(a) - Number(b);
}

export function paginateInMemory<T extends { id: number }>(
  items: T[],
  query: AdminListQuery,
  options: PaginateOptions<T>,
): Paginated<T> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

  let filtered = items;
  if (query.search) {
    const term = normalizeText(query.search);
    const id = /^\d+$/.test(term) ? Number(term) : undefined;
    filtered = items.filter(
      (item) =>
        item.id === id ||
        options.searchText(item).some((text) => normalizeText(text).includes(term)),
    );
  }

  const sortValue = options.sortValues[query.sort ?? 'id'] ?? ((item: T) => item.id);
  const direction = query.order === 'desc' ? -1 : 1;
  const sorted = [...filtered].sort(
    (a, b) => direction * compare(sortValue(a), sortValue(b)) || a.id - b.id,
  );

  const start = (page - 1) * pageSize;
  return { data: sorted.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

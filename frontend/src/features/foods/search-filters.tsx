import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listCategories } from '@/features/foods/categories-api';
import { UFS } from '@/lib/validation';

const ALL = 'all';
const DEBOUNCE_MS = 400;

interface SearchFiltersProps {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}

function useDebouncedParam(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  key: string,
) {
  const urlValue = searchParams.get(key) ?? '';
  const [local, setLocal] = useState(urlValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Reset the local draft when the committed URL value changes from elsewhere
  // (e.g. "Limpar filtros") — adjusting state during render, not in an effect.
  const [lastUrlValue, setLastUrlValue] = useState(urlValue);
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    setLocal(urlValue);
  }

  function onChange(next: string) {
    setLocal(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSearchParams(
        (params) => {
          const trimmed = next.trim();
          if (trimmed) params.set(key, trimmed);
          else params.delete(key);
          params.delete('page');
          return params;
        },
        { replace: true },
      );
    }, DEBOUNCE_MS);
  }

  return [local, onChange] as const;
}

export function SearchFilters({ searchParams, setSearchParams }: SearchFiltersProps) {
  const [name, setName] = useDebouncedParam(searchParams, setSearchParams, 'name');
  const [city, setCity] = useDebouncedParam(searchParams, setSearchParams, 'city');

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 10 * 60_000,
  });

  const categoryId = searchParams.get('categoryId') ?? ALL;
  const state = searchParams.get('state') ?? ALL;

  function setDiscreteParam(key: string, value: string) {
    setSearchParams(
      (params) => {
        if (value === ALL) params.delete(key);
        else params.set(key, value);
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-input bg-background flex items-center gap-2 rounded-md border px-3.5 py-2.5">
        <SearchIcon className="text-muted-foreground size-4 shrink-0" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Buscar por nome do alimento..."
          className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select value={categoryId} onValueChange={(v) => setDiscreteParam('categoryId', v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {categoriesQuery.data?.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={state} onValueChange={(v) => setDiscreteParam('state', v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os estados</SelectItem>
            {UFS.map((sigla) => (
              <SelectItem key={sigla} value={sigla}>
                {sigla}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Cidade"
          className="border-input bg-background placeholder:text-muted-foreground h-9 w-[220px] rounded-md border px-3 text-sm shadow-xs outline-none"
        />
      </div>
    </div>
  );
}

import type { Ref } from 'react';
import { useEffect, useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { citiesOf } from '@/lib/ibge';

const MAX_RESULTS = 8;
const MIN_QUERY_LENGTH = 3;

interface CityAutocompleteProps {
  uf: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  name: string;
  inputRef?: Ref<HTMLInputElement>;
}

// Decoupled from any specific form schema — the caller owns the `FormField`
// wrapper and wires `value`/`onChange`/`onBlur` from its own field, so this
// works for any form that has a `city` string field (sign-up and profile).
export function CityAutocomplete({
  uf,
  value,
  onChange,
  onBlur,
  name,
  inputRef,
}: CityAutocompleteProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  // Caller remounts this on UF change (`key={uf}`), so `cities` already starts
  // empty — no synchronous setState needed here.
  useEffect(() => {
    if (!uf) return;
    let alive = true;
    void citiesOf(uf).then((list) => {
      if (alive) setCities(list);
    });
    return () => {
      alive = false;
    };
  }, [uf]);

  const query = value ?? '';
  const matches =
    query.trim().length >= MIN_QUERY_LENGTH
      ? cities
          .filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, MAX_RESULTS)
      : [];
  const showList = open && matches.length > 0 && !(matches.length === 1 && matches[0] === query);

  const select = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        name={name}
        ref={inputRef}
        value={query}
        disabled={!uf}
        autoComplete="off"
        placeholder={uf ? 'Cidade' : 'Selecione a UF primeiro'}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          onBlur();
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            select(matches[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />

      {showList && (
        <div
          role="listbox"
          id={listId}
          className="bg-popover text-popover-foreground absolute top-full z-20 mt-1 w-full overflow-hidden rounded-md border shadow-md"
        >
          {matches.map((city, i) => (
            <button
              key={city}
              type="button"
              role="option"
              id={`${listId}-${i}`}
              aria-selected={i === active}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-sm',
                i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                select(city);
              }}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

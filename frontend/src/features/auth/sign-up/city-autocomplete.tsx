import { useEffect, useId, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { citiesOf } from '@/features/auth/sign-up/ibge';
import type { SignUpInput } from '@/features/auth/sign-up/sign-up-schema';
import { cn } from '@/lib/cn';

const MAX_RESULTS = 8;

/**
 * Campo "Cidade" com autocomplete dos municípios da UF selecionada (dados do
 * IBGE, decisão 16). Aceita valor digitado livre. Desabilitado enquanto não há
 * UF; trocar a UF recarrega a lista.
 */
export function CityAutocomplete({ uf }: { uf: string }) {
  const { control } = useFormContext<SignUpInput>();
  const [cities, setCities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  // O componente é remontado por UF (`key={uf}` no pai), então `cities` já
  // começa vazio a cada troca de estado — sem setState síncrono aqui.
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

  return (
    <FormField
      control={control}
      name="city"
      render={({ field }) => {
        const query = field.value ?? '';
        const matches =
          query.trim().length >= 1
            ? cities
                .filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()))
                .slice(0, MAX_RESULTS)
            : [];
        const showList =
          open && matches.length > 0 && !(matches.length === 1 && matches[0] === query);

        const select = (city: string) => {
          field.onChange(city);
          setOpen(false);
        };

        return (
          <FormItem className="relative">
            <FormLabel>Cidade</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                ref={field.ref}
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
                  field.onChange(e);
                  setOpen(true);
                  setActive(0);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                  field.onBlur();
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
            </FormControl>

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

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

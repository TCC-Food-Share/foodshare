import { CheckIcon, ChevronsUpDownIcon, LightbulbIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import { normalizeText } from '@/lib/normalize-text';

export interface SearchableOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  id?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  invalid?: boolean;
  footer?: ReactNode;
  onSuggest?: (search: string) => void;
}

function filterOption(value: string, search: string, keywords?: string[]): number {
  const term = normalizeText(search);
  const haystack = [value, ...(keywords ?? [])].map(normalizeText);
  return haystack.some((text) => text.includes(term)) ? 1 : 0;
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
  invalid,
  footer,
  onSuggest,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => option.value === value);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            invalid && 'border-destructive',
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        portalled={false}
      >
        <Command filter={filterOption}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  keywords={option.keywords}
                  onSelect={() => {
                    onChange(option.value);
                    changeOpen(false);
                  }}
                >
                  <CheckIcon className={cn(option.value === value ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {footer}
          {onSuggest && (
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start font-normal"
                onClick={() => {
                  const term = search.trim();
                  changeOpen(false);
                  onSuggest(term);
                }}
              >
                <LightbulbIcon />
                Sugerir nova opção
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

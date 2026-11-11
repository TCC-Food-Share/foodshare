import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

const SEARCH_DELAY_MS = 300;

interface SearchInputProps {
  /** Valor já aplicado (por exemplo, o que está no endereço da página). */
  value: string;
  /** Chamado com o texto aparado, depois de uma pausa na digitação. */
  onSearch: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchInput({ value, onSearch, placeholder, className }: SearchInputProps) {
  const [text, setText] = useState(value);
  const [appliedValue, setAppliedValue] = useState(value);

  // Segue o valor aplicado quando ele muda por fora (ex.: "Limpar busca", botão voltar).
  if (value !== appliedValue) {
    setAppliedValue(value);
    setText(value);
  }

  useEffect(() => {
    if (text.trim() === value) return;
    const timer = setTimeout(() => onSearch(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, value, onSearch]);

  return (
    <div className={cn('relative', className)}>
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
        maxLength={100}
      />
    </div>
  );
}

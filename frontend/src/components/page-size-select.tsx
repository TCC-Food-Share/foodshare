import { useId } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZES } from '@/lib/pagination';

export function PageSizeSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (pageSize: number) => void;
}) {
  const labelId = useId();

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-[13px]">
      <span id={labelId}>Itens por página</span>
      <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger size="sm" aria-labelledby={labelId} className="h-7 w-[72px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

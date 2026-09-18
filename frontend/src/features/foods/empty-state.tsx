import { SearchXIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function EmptyState({ hasActiveFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchXIcon className="text-muted-foreground size-10" />
      <p className="text-foreground font-medium">Nenhum alimento encontrado</p>
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

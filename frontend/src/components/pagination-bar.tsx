import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages: number[] = [];
  for (let p = Math.max(1, start); p <= end; p++) pages.push(p);
  return pages;
}

export function PaginationBar({ page, totalPages, onPageChange, className }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className={className}>
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious onClick={() => onPageChange(page - 1)} />
          </PaginationItem>
        )}
        {pageWindow(page, totalPages).map((p) => (
          <PaginationItem key={p}>
            <PaginationLink isActive={p === page} onClick={() => onPageChange(p)}>
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        {page < totalPages && (
          <PaginationItem>
            <PaginationNext onClick={() => onPageChange(page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}

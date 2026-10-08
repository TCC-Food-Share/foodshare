import { ConstructionIcon } from 'lucide-react';

export function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
        <ConstructionIcon className="size-8" />
        <p className="text-sm">Esta funcionalidade ainda está em construção.</p>
      </div>
    </div>
  );
}

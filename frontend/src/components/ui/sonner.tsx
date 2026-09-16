import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--primary)',
          '--normal-text': 'var(--primary-foreground)',
          '--normal-border': 'var(--primary)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };

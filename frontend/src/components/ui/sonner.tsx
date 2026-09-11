import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Toasts no tema Food Share: fundo azul (`--primary`), texto e ícones brancos
 * (`--primary-foreground`). `richColors` fica desligado — assim o sonner usa
 * `--normal-*` para todos os tipos (sucesso, erro, info).
 */
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

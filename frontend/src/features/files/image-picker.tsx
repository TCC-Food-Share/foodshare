import { ImageIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ACCEPTED_IMAGE_TYPES, imageFileProblem } from '@/features/files/image-rules';
import { cn } from '@/lib/cn';

type ImagePickerProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: File | null | undefined;
  onChange: (file: File | null) => void;
  onReject: (message: string) => void;
  currentUrl?: string | null;
  fallback?: ReactNode;
};

export function ImagePicker({
  value,
  onChange,
  onReject,
  currentUrl,
  fallback,
  className,
  ...inputProps
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLImageElement>(null);
  const [currentFailed, setCurrentFailed] = useState(false);

  useEffect(() => {
    if (!value || !previewRef.current) return;
    const url = URL.createObjectURL(value);
    previewRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const message = imageFileProblem(file);
    if (message) onReject(message);
    else onChange(file);
  }

  const showCurrent = !value && currentUrl && !currentFailed;

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm">
        {value ? (
          <img ref={previewRef} alt="Prévia da foto escolhida" className="size-full object-cover" />
        ) : showCurrent ? (
          <img
            src={currentUrl}
            alt="Foto atual"
            className="size-full object-cover"
            onError={() => setCurrentFailed(true)}
          />
        ) : (
          (fallback ?? <ImageIcon className="size-7" />)
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          {...inputProps}
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="sr-only"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => inputRef.current?.click()}
        >
          {value || showCurrent ? 'Trocar foto' : 'Escolher foto'}
        </Button>
        <span className="text-muted-foreground text-xs">JPEG, PNG ou WebP, até 5 MB.</span>
      </div>
    </div>
  );
}

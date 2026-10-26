import { ImageIcon, UploadIcon } from 'lucide-react';
import {
  type ComponentProps,
  type DragEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { ACCEPTED_IMAGE_TYPES, imageFileProblem } from '@/features/files/image-rules';
import { cn } from '@/lib/cn';

type ImagePickerProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: File | null | undefined;
  onChange: (file: File | null) => void;
  onReject: (message: string) => void;
  currentUrl?: string | null;
  fallback?: ReactNode;
  variant?: 'avatar' | 'dropzone';
};

const IMAGE_HINT = 'JPEG, PNG ou WebP, até 5 MB.';

export function ImagePicker({
  value,
  onChange,
  onReject,
  currentUrl,
  fallback,
  variant = 'avatar',
  className,
  ...inputProps
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLImageElement>(null);
  const [currentFailed, setCurrentFailed] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!value || !previewRef.current) return;
    const url = URL.createObjectURL(value);
    previewRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    const message = imageFileProblem(file);
    if (message) onReject(message);
    else onChange(file);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    pickFile(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files[0]);
  }

  const showCurrent = !value && currentUrl && !currentFailed;
  const openPicker = () => inputRef.current?.click();

  const fileInput = (
    <input
      {...inputProps}
      ref={inputRef}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(',')}
      className="sr-only"
      onChange={handleFile}
    />
  );

  if (variant === 'dropzone') {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {fileInput}
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'border-input bg-background hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-30 w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md border p-2 transition-colors outline-none focus-visible:ring-[3px]',
            dragging && 'border-primary bg-primary/5',
          )}
        >
          {value ? (
            <>
              <img
                ref={previewRef}
                alt="Prévia da foto escolhida"
                className="min-h-0 flex-1 rounded object-contain"
              />
              <span className="text-muted-foreground text-xs">
                Clique ou arraste outra imagem para trocar
              </span>
            </>
          ) : (
            <>
              <UploadIcon className="text-muted-foreground size-6" />
              <span className="text-foreground text-[13px] font-medium">
                Clique para enviar ou arraste a imagem aqui
              </span>
            </>
          )}
        </button>
        <span className="text-muted-foreground text-xs">{IMAGE_HINT}</span>
      </div>
    );
  }

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
        {fileInput}
        <Button type="button" variant="outline" className="self-start" onClick={openPicker}>
          {value || showCurrent ? 'Trocar foto' : 'Escolher foto'}
        </Button>
        <span className="text-muted-foreground text-xs">{IMAGE_HINT}</span>
      </div>
    </div>
  );
}

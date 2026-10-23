import { useState } from 'react';

import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export function UserAvatar({
  image,
  name,
  className,
}: {
  image: string | null;
  name: string;
  className?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  if (image && failedImage !== image) {
    return (
      <img
        src={image}
        alt=""
        className={cn('rounded-full object-cover shadow-sm', className)}
        onError={() => setFailedImage(image)}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-primary text-primary-foreground flex items-center justify-center rounded-full font-medium shadow-sm',
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

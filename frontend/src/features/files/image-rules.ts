import { z } from 'zod';

import { IMAGE_ERROR_MESSAGES } from '@/features/files/image-errors';

// Mirrors MAX_IMAGE_SIZE and IMAGE_TYPES in backend/src/files/files.constants.ts — keep in sync.
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Um único check, em vez de `z.instanceof(File).refine(...)`: no zod v4, o
// `instanceof` falho seguido de refines aborta o objeto que contém o campo, e
// os refines do objeto (ex.: senhas diferentes) deixam de rodar enquanto a
// imagem não é escolhida.
export const imageFileSchema = z.custom<File>().superRefine((file, ctx) => {
  if (!(file instanceof File)) {
    ctx.addIssue({ code: 'custom', message: IMAGE_ERROR_MESSAGES.IMAGE_REQUIRED });
  } else if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    ctx.addIssue({ code: 'custom', message: IMAGE_ERROR_MESSAGES.IMAGE_INVALID_TYPE });
  } else if (file.size > MAX_IMAGE_SIZE) {
    ctx.addIssue({ code: 'custom', message: IMAGE_ERROR_MESSAGES.IMAGE_TOO_LARGE });
  }
});

export function imageFileProblem(file: File): string | null {
  const result = imageFileSchema.safeParse(file);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

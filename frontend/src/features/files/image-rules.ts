import { z } from 'zod';

import { IMAGE_ERROR_MESSAGES } from '@/features/files/image-errors';

// Mirrors MAX_IMAGE_SIZE and IMAGE_TYPES in backend/src/files/files.constants.ts — keep in sync.
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const imageFileSchema = z
  .instanceof(File, { error: IMAGE_ERROR_MESSAGES.IMAGE_REQUIRED })
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
    error: IMAGE_ERROR_MESSAGES.IMAGE_INVALID_TYPE,
  })
  .refine((file) => file.size <= MAX_IMAGE_SIZE, {
    error: IMAGE_ERROR_MESSAGES.IMAGE_TOO_LARGE,
  });

export function imageFileProblem(file: File): string | null {
  const result = imageFileSchema.safeParse(file);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

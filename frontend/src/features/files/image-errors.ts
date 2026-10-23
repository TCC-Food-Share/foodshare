import { ApiError } from '@/lib/api';

export const IMAGE_ERROR_MESSAGES = {
  IMAGE_REQUIRED: 'Envie uma foto de perfil.',
  IMAGE_TOO_LARGE: 'A imagem deve ter no máximo 5 MB.',
  IMAGE_INVALID_TYPE: 'Use uma imagem JPEG, PNG ou WebP.',
} as const;

type ImageErrorCode = keyof typeof IMAGE_ERROR_MESSAGES;

function isImageErrorCode(value: unknown): value is ImageErrorCode {
  return typeof value === 'string' && value in IMAGE_ERROR_MESSAGES;
}

export function imageErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  const body = error.body;
  if (body && typeof body === 'object' && 'code' in body && isImageErrorCode(body.code)) {
    return IMAGE_ERROR_MESSAGES[body.code];
  }
  return null;
}

export const IMAGE_FOLDER = {
  USERS: 'users',
  FOODS: 'foods',
} as const;

export type ImageFolder = (typeof IMAGE_FOLDER)[keyof typeof IMAGE_FOLDER];

export const IMAGE_FOLDERS: readonly string[] = Object.values(IMAGE_FOLDER);

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const IMAGE_FIELD = 'image';

export const IMAGE_REQUIRED = 'IMAGE_REQUIRED';
export const IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE';
export const IMAGE_INVALID_TYPE = 'IMAGE_INVALID_TYPE';

export const IMAGE_TYPES = {
  jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
  png: { extension: 'png', contentType: 'image/png' },
  webp: { extension: 'webp', contentType: 'image/webp' },
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

export const IMAGE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

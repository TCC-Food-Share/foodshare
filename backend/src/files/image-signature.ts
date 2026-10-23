import type { ImageType } from './files.constants';

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function matches(buffer: Buffer, signature: number[], offset = 0): boolean {
  return (
    buffer.length >= offset + signature.length &&
    signature.every((byte, index) => buffer[offset + index] === byte)
  );
}

export function detectImageType(buffer: Buffer): ImageType | null {
  if (matches(buffer, JPEG)) return 'jpeg';
  if (matches(buffer, PNG)) return 'png';
  if (matches(buffer, RIFF) && matches(buffer, WEBP, 8)) return 'webp';
  return null;
}

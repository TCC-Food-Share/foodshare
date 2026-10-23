import { describe, expect, it } from '@jest/globals';

import {
  IMAGE_INVALID_TYPE,
  IMAGE_REQUIRED,
  IMAGE_TOO_LARGE,
  MAX_IMAGE_SIZE,
} from './files.constants';
import { ImageFilePipe } from './image-file.pipe';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 '),
]);
const GIF = Buffer.from('GIF89a');
const PDF = Buffer.from('%PDF-1.7');
const RIFF_WAVE = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')]);

function file(buffer: Buffer, overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    buffer,
    size: buffer.length,
    originalname: 'foto.png',
    mimetype: 'image/png',
    ...overrides,
  } as Express.Multer.File;
}

describe('ImageFilePipe', () => {
  const required = new ImageFilePipe({ required: true });
  const optional = new ImageFilePipe({ required: false });

  it.each([
    ['jpeg', JPEG],
    ['png', PNG],
    ['webp', WEBP],
  ])('accepts a %s file by its content', (type, buffer) => {
    expect(required.transform(file(buffer))).toEqual({ buffer, type });
  });

  it.each([
    ['GIF', GIF],
    ['PDF renamed to .png', PDF],
    ['RIFF that is not WebP', RIFF_WAVE],
    ['empty file', Buffer.alloc(0)],
  ])('rejects a %s with IMAGE_INVALID_TYPE', (_label, buffer) => {
    expect(() => required.transform(file(buffer))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: IMAGE_INVALID_TYPE }) }),
    );
  });

  it('accepts exactly 5 MB', () => {
    expect(required.transform(file(PNG, { size: MAX_IMAGE_SIZE }))?.type).toBe('png');
  });

  it('rejects 5 MB plus one byte with IMAGE_TOO_LARGE', () => {
    expect(() => required.transform(file(PNG, { size: MAX_IMAGE_SIZE + 1 }))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: IMAGE_TOO_LARGE }) }),
    );
  });

  it('rejects a missing file with IMAGE_REQUIRED when required', () => {
    expect(() => required.transform(undefined)).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: IMAGE_REQUIRED }) }),
    );
  });

  it('passes a missing file through when optional', () => {
    expect(optional.transform(undefined)).toBeUndefined();
  });
});

import { Readable } from 'node:stream';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Response } from 'express';

import { FilesController } from './files.controller';
import type { ImageStorageService, StoredImage } from './image-storage.service';

const NAME = '3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f.png';

describe('FilesController', () => {
  const read = jest.fn((_key: string): Promise<StoredImage | null> => Promise.resolve(null));
  const set = jest.fn();
  const res = { set } as unknown as Response;
  let controller: FilesController;

  beforeEach(() => {
    read.mockClear();
    set.mockClear();
    controller = new FilesController({ read } as unknown as ImageStorageService);
  });

  it('streams a stored image with its content type and a long private cache', async () => {
    read.mockResolvedValueOnce({ body: Readable.from(['x']), contentType: 'image/png' });

    await expect(controller.read('users', NAME, res)).resolves.toBeDefined();
    expect(read).toHaveBeenCalledWith(`users/${NAME}`);
    expect(set).toHaveBeenCalledWith({
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=31536000, immutable',
    });
  });

  it('answers 404 for a missing key', async () => {
    await expect(controller.read('users', NAME, res)).rejects.toMatchObject({ status: 404 });
  });

  it.each([
    ['unknown folder', 'secrets', NAME],
    ['path traversal', '..', NAME],
    ['non-uuid name', 'users', 'avatar.png'],
    ['unsupported extension', 'users', NAME.replace('.png', '.gif')],
    ['traversal in the name', 'users', `..%2F${NAME}`],
  ])('answers 404 for %s without reading the storage', async (_label, folder, name) => {
    await expect(controller.read(folder, name, res)).rejects.toMatchObject({ status: 404 });
    expect(read).not.toHaveBeenCalled();
  });
});

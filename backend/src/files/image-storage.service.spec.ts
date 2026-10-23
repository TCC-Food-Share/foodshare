import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';

import { ImageStorageService } from './image-storage.service';

describe('ImageStorageService.toUrl', () => {
  const original = process.env.BETTER_AUTH_URL;
  let service: ImageStorageService;

  beforeEach(() => {
    process.env.BETTER_AUTH_URL = 'https://api.staging.foodshare.com.br';
    service = new ImageStorageService();
  });

  afterEach(() => {
    process.env.BETTER_AUTH_URL = original;
  });

  it('builds the read route URL from the key', () => {
    expect(service.toUrl('users/abc.png')).toBe(
      'https://api.staging.foodshare.com.br/files/users/abc.png',
    );
  });

  it.each([null, undefined, ''])('returns null for %p', (key) => {
    expect(service.toUrl(key)).toBeNull();
  });
});

describe('ImageStorageService.removeQuietly', () => {
  it('logs and swallows a delete failure', async () => {
    const service = new ImageStorageService();
    const send = jest
      .spyOn(service['client'], 'send')
      .mockRejectedValue(new Error('minio down') as never);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(service.removeQuietly('users/old.png')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();

    send.mockRestore();
    errorSpy.mockRestore();
  });
});

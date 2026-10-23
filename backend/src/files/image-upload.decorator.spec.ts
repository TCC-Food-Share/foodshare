import { describe, expect, it } from '@jest/globals';
import { type CallHandler, type ExecutionContext, PayloadTooLargeException } from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';

import { IMAGE_TOO_LARGE } from './files.constants';
import { ImageTooLargeInterceptor } from './image-upload.decorator';

function failingWith(error: Error): CallHandler {
  return { handle: () => throwError(() => error) };
}

describe('ImageTooLargeInterceptor', () => {
  const interceptor = new ImageTooLargeInterceptor();
  const context = {} as ExecutionContext;

  it('turns the multer 413 into a 400 with IMAGE_TOO_LARGE', async () => {
    await expect(
      firstValueFrom(
        interceptor.intercept(context, failingWith(new PayloadTooLargeException('File too large'))),
      ),
    ).rejects.toMatchObject({ status: 400, response: { code: IMAGE_TOO_LARGE } });
  });

  it('passes any other error through unchanged', async () => {
    const error = new Error('boom');

    await expect(firstValueFrom(interceptor.intercept(context, failingWith(error)))).rejects.toBe(
      error,
    );
  });
});

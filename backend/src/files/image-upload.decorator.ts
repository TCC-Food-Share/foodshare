import {
  applyDecorators,
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { catchError, Observable, throwError } from 'rxjs';

import { IMAGE_FIELD, IMAGE_TOO_LARGE, MAX_IMAGE_SIZE } from './files.constants';

@Injectable()
export class ImageTooLargeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof PayloadTooLargeException
            ? new BadRequestException({
                code: IMAGE_TOO_LARGE,
                message: 'Image must be at most 5 MB.',
              })
            : error,
        ),
      ),
    );
  }
}

export function ImageUpload(options: { body: Type; required: boolean }) {
  return applyDecorators(
    // Must stay first: it catches the 413 the file interceptor throws for oversized files.
    UseInterceptors(
      ImageTooLargeInterceptor,
      FileInterceptor(IMAGE_FIELD, {
        limits: { fileSize: MAX_IMAGE_SIZE, files: 1, fields: 30 },
      }),
    ),
    ApiConsumes('multipart/form-data'),
    ApiExtraModels(options.body),
    ApiBody({
      schema: {
        allOf: [
          { $ref: getSchemaPath(options.body) },
          {
            type: 'object',
            required: options.required ? [IMAGE_FIELD] : [],
            properties: {
              [IMAGE_FIELD]: {
                type: 'string',
                format: 'binary',
                description: 'Imagem JPEG, PNG ou WebP de até 5 MB.',
              },
            },
          },
        ],
      },
    }),
  );
}

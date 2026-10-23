import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import {
  IMAGE_INVALID_TYPE,
  IMAGE_REQUIRED,
  IMAGE_TOO_LARGE,
  type ImageType,
  MAX_IMAGE_SIZE,
} from './files.constants';
import { detectImageType } from './image-signature';

export interface ValidatedImage {
  buffer: Buffer;
  type: ImageType;
}

@Injectable()
export class ImageFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  ValidatedImage | undefined
> {
  constructor(private readonly options: { required: boolean }) {}

  transform(file: Express.Multer.File | undefined): ValidatedImage | undefined {
    if (!file) {
      if (this.options.required) {
        throw new BadRequestException({ code: IMAGE_REQUIRED, message: 'Image is required.' });
      }
      return undefined;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException({
        code: IMAGE_TOO_LARGE,
        message: 'Image must be at most 5 MB.',
      });
    }

    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException({
        code: IMAGE_INVALID_TYPE,
        message: 'Image must be a JPEG, PNG or WebP file.',
      });
    }

    return { buffer: file.buffer, type };
  }
}

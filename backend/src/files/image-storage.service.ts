import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { IMAGE_TYPES, type ImageFolder } from './files.constants';
import type { ValidatedImage } from './image-file.pipe';
import { createStorageClient, storageBucket } from './storage-client';

export interface StoredImage {
  body: Readable;
  contentType: string;
}

@Injectable()
export class ImageStorageService implements OnModuleInit {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly bucket = storageBucket();
  private readonly client = createStorageClient();

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if ((error as { name?: string }).name !== 'NotFound') {
        this.logger.error(
          `Image storage unavailable (bucket "${this.bucket}")`,
          error instanceof Error ? error.stack : String(error),
        );
        return;
      }
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket "${this.bucket}"`);
      } catch (createError) {
        this.logger.error(
          `Failed to create bucket "${this.bucket}"`,
          createError instanceof Error ? createError.stack : String(createError),
        );
      }
    }
  }

  async store(folder: ImageFolder, image: ValidatedImage): Promise<string> {
    const { extension, contentType } = IMAGE_TYPES[image.type];
    const key = `${folder}/${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: image.buffer,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async removeQuietly(key: string): Promise<void> {
    try {
      await this.remove(key);
    } catch (error) {
      this.logger.error(
        `Failed to remove image "${key}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async read(key: string): Promise<StoredImage | null> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        body: object.Body as Readable,
        contentType: object.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  toUrl(key: string | null | undefined): string | null {
    if (!key) return null;
    return `${process.env.BETTER_AUTH_URL}/files/${key}`;
  }
}

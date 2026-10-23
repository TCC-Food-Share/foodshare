import { S3Client } from '@aws-sdk/client-s3';

export function storageBucket(): string {
  return process.env.MINIO_BUCKET ?? 'foodshare-dev';
}

export function createStorageClient(): S3Client {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? '',
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
    },
  });
}

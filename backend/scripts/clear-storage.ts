import 'dotenv/config';

import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

import {
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  type ObjectIdentifier,
} from '@aws-sdk/client-s3';

import { createStorageClient, storageBucket } from '../src/files/storage-client';

const client = createStorageClient();
const bucket = storageBucket();

async function bucketExists(): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === 'NotFound') return false;
    throw error;
  }
}

async function confirm(): Promise<boolean> {
  if (process.argv.includes('--force')) return true;
  const readline = createInterface({ input, output });
  const answer = await readline.question(
    `This permanently deletes every object in bucket "${bucket}" at ${process.env.MINIO_ENDPOINT}.\n` +
      `Type the bucket name to confirm: `,
  );
  readline.close();
  return answer.trim() === bucket;
}

async function main() {
  if (!(await bucketExists())) {
    console.warn(`Bucket "${bucket}" does not exist. Nothing to clear.`);
    return;
  }
  if (!(await confirm())) {
    console.warn('Aborted: confirmation did not match the bucket name.');
    process.exitCode = 1;
    return;
  }

  let deleted = 0;
  let failed = 0;
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    );
    const objects: ObjectIdentifier[] = (page.Contents ?? []).map(({ Key }) => ({ Key }));
    if (objects.length > 0) {
      const result = await client.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }),
      );
      const errors = result.Errors ?? [];
      for (const error of errors) {
        console.error(`Failed to delete "${error.Key}": ${error.Message}`);
      }
      failed += errors.length;
      deleted += objects.length - errors.length;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  console.warn(`Deleted ${deleted} object(s) from bucket "${bucket}".`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

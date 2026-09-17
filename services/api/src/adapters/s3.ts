import { randomBytes } from 'node:crypto';
import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { DocumentType } from '@kagazready/contracts';
import { config } from '../config.js';

/**
 * S3 adapter.
 *
 * The bucket is private with Block Public Access on. Browsers never receive credentials — they get
 * a presigned POST whose policy pins the key, the content type, and the content length, and which
 * expires in a couple of minutes.
 */

let client: S3Client | undefined;
const s3 = (): S3Client => (client ??= new S3Client({ region: config().region }));

/** Test seam. */
export function setS3Client(next: S3Client | undefined): void {
  client = next;
}

export function newAnalysisId(): string {
  return randomBytes(16).toString('hex');
}

const extensionFor = (contentType: string): 'jpg' | 'png' =>
  contentType === 'image/png' ? 'png' : 'jpg';

/**
 * Build an upload key. The random token means a key cannot be guessed from the analysis ID, and a
 * replacement upload never collides with the document it replaces.
 */
export function newObjectKey(
  analysisId: string,
  documentType: DocumentType,
  contentType: string,
): string {
  return `uploads/${analysisId}/${documentType}/${randomBytes(8).toString('hex')}.${extensionFor(contentType)}`;
}

export const analysisPrefix = (analysisId: string): string => `uploads/${analysisId}/`;

export interface PresignedUpload {
  url: string;
  fields: Record<string, string>;
  expiresInSeconds: number;
}

export async function presignUpload(
  objectKey: string,
  contentType: string,
  maxBytes: number,
): Promise<PresignedUpload> {
  const { uploadBucket, presignExpirySeconds } = config();

  const presigned = await createPresignedPost(s3(), {
    Bucket: uploadBucket,
    Key: objectKey,
    Expires: presignExpirySeconds,
    Conditions: [
      // The browser cannot choose a different key, a different type, or a larger file.
      ['eq', '$key', objectKey],
      ['eq', '$Content-Type', contentType],
      ['content-length-range', 1, maxBytes],
    ],
    Fields: { 'Content-Type': contentType },
  });

  return {
    url: presigned.url,
    fields: presigned.fields,
    expiresInSeconds: presignExpirySeconds,
  };
}

export interface ObjectFacts {
  contentLength: number;
  contentType: string;
}

/** Returns null when the object is not there. */
export async function headObject(objectKey: string): Promise<ObjectFacts | null> {
  try {
    const result = await s3().send(
      new HeadObjectCommand({ Bucket: config().uploadBucket, Key: objectKey }),
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType ?? '',
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = 'name' in error ? String(error.name) : '';
  const status =
    '$metadata' in error && typeof error.$metadata === 'object' && error.$metadata !== null
      ? (error.$metadata as { httpStatusCode?: number }).httpStatusCode
      : undefined;
  return name === 'NotFound' || name === 'NoSuchKey' || status === 404;
}

/**
 * Delete every object under an analysis prefix.
 *
 * Used by the deletion endpoint. The prefix is derived from the analysis ID rather than from
 * anything the caller sends, so a caller cannot direct a delete at another analysis.
 */
export async function deleteAnalysisObjects(analysisId: string): Promise<number> {
  const { uploadBucket } = config();
  const prefix = analysisPrefix(analysisId);
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const listed = await s3().send(
      new ListObjectsV2Command({
        Bucket: uploadBucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (listed.Contents ?? [])
      .map((entry) => entry.Key)
      .filter((key): key is string => typeof key === 'string' && key.startsWith(prefix));

    if (keys.length > 0) {
      await s3().send(
        new DeleteObjectsCommand({
          Bucket: uploadBucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      deleted += keys.length;
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}

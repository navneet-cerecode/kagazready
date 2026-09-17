import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract';
import type { DocumentType } from '@kagazready/contracts';
import type { OcrDocument, OcrLine } from '@kagazready/rules';
import { config } from '../config.js';
import { upstreamUnavailable } from '../http.js';

/**
 * Amazon Textract adapter.
 *
 * `DetectDocumentText` is the cheapest Textract operation and returns exactly what the rule engine
 * needs: lines of text, each with a confidence. Forms and tables analysis would cost several times
 * as much for information these rules do not use.
 */

let client: TextractClient | undefined;
const textract = (): TextractClient => (client ??= new TextractClient({ region: config().region }));

/** Test seam. */
export function setTextractClient(next: TextractClient | undefined): void {
  client = next;
}

export async function detectDocumentText(
  documentType: DocumentType,
  objectKey: string,
): Promise<OcrDocument> {
  try {
    const response = await textract().send(
      new DetectDocumentTextCommand({
        Document: { S3Object: { Bucket: config().uploadBucket, Name: objectKey } },
      }),
    );

    const lines: OcrLine[] = (response.Blocks ?? [])
      .filter((block) => block.BlockType === 'LINE')
      .flatMap((block) =>
        typeof block.Text === 'string' && block.Text.trim() !== ''
          ? [{ text: block.Text, confidence: block.Confidence ?? 0 }]
          : [],
      );

    return { documentType, lines };
  } catch (error) {
    // Textract failing is an upstream problem, not a bad request. The caller sees a retryable 503;
    // the detail goes to CloudWatch only.
    throw upstreamUnavailable(
      `textract failed for ${documentType}: ${error instanceof Error ? error.name : 'unknown'}`,
    );
  }
}

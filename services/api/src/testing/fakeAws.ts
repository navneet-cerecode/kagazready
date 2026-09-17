import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { S3Client } from '@aws-sdk/client-s3';
import type { TextractClient } from '@aws-sdk/client-textract';
import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { OcrDocument } from '@kagazready/rules';

/**
 * Small in-memory stand-ins for the AWS SDK clients, driven through the adapters' test seams.
 *
 * These deliberately imitate the behaviour the handlers depend on — conditional writes that fail,
 * atomic counters that stop at a cap, objects that are absent — rather than asserting that certain
 * SDK methods were called. A test that only checks "send was called" would pass even if the
 * condition expressions were wrong, which is the part that actually protects the budget.
 */

class ConditionalCheckFailedException extends Error {
  constructor() {
    super('The conditional request failed');
    this.name = 'ConditionalCheckFailedException';
  }
}

class NotFound extends Error {
  constructor() {
    super('Not Found');
    this.name = 'NotFound';
  }
}

type Item = Record<string, unknown>;

export interface FakeDynamo {
  client: DynamoDBDocumentClient;
  items: Map<string, Item>;
  /** Commands seen, for assertions about what was and was not attempted. */
  commands: string[];
}

export function fakeDynamo(): FakeDynamo {
  const items = new Map<string, Item>();
  const commands: string[] = [];

  const send = async (command: { constructor: { name: string }; input: Record<string, never> }) => {
    const name = command.constructor.name;
    commands.push(name);
    const input = command.input as Record<string, unknown>;
    const key = (input.Key as { pk?: string } | undefined)?.pk;

    if (name === 'PutCommand') {
      const item = input.Item as Item;
      const pk = String(item.pk);
      if (input.ConditionExpression === 'attribute_not_exists(pk)' && items.has(pk)) {
        throw new ConditionalCheckFailedException();
      }
      items.set(pk, { ...item });
      return {};
    }

    if (name === 'GetCommand') {
      const item = key !== undefined ? items.get(key) : undefined;
      return { Item: item ? { ...item } : undefined };
    }

    if (name === 'DeleteCommand') {
      if (key !== undefined) items.delete(key);
      return {};
    }

    if (name === 'UpdateCommand') {
      const expression = String(input.UpdateExpression);
      const values = (input.ExpressionAttributeValues ?? {}) as Record<string, unknown>;
      const names = (input.ExpressionAttributeNames ?? {}) as Record<string, string>;
      const pk = String(key);

      // The daily cap counter: an atomic increment guarded by the cap itself.
      if (expression.includes('ADD #count')) {
        const existing = items.get(pk);
        const count = typeof existing?.count === 'number' ? existing.count : 0;
        const cap = Number(values[':cap']);
        if (existing !== undefined && count >= cap) throw new ConditionalCheckFailedException();
        items.set(pk, {
          pk,
          count: count + 1,
          expiresAt: existing?.expiresAt ?? values[':expiresAt'],
        });
        return {};
      }

      const existing = items.get(pk);
      if (!existing) throw new ConditionalCheckFailedException();
      const next: Item = { ...existing };

      if (expression.includes(':complete')) {
        next.state = 'complete';
        next.outcome = values[':outcome'];
        next.documents = values[':documents'];
        next.language = values[':language'];
      }
      if (expression.includes(':processing')) {
        next.state = 'processing';
      }
      if (expression.includes('explanations.#lang')) {
        const language = names['#lang'] ?? 'en';
        next.explanations = {
          ...((existing.explanations as Record<string, unknown>) ?? {}),
          [language]: values[':explanations'],
        };
      }
      next.updatedAt = values[':now'];

      items.set(pk, next);
      return { Attributes: { ...next } };
    }

    throw new Error(`fakeDynamo received an unexpected command: ${name}`);
  };

  return {
    client: { send } as unknown as DynamoDBDocumentClient,
    items,
    commands,
  };
}

export interface FakeS3Options {
  /** Object key to facts. A key that is absent behaves as a missing object. */
  objects?: Record<string, { contentLength: number; contentType: string }>;
  presignFails?: boolean;
}

export interface FakeS3 {
  client: S3Client;
  objects: Map<string, { contentLength: number; contentType: string }>;
  deletedKeys: string[];
}

export function fakeS3(options: FakeS3Options = {}): FakeS3 {
  const objects = new Map(Object.entries(options.objects ?? {}));
  const deletedKeys: string[] = [];

  const send = async (command: { constructor: { name: string }; input: Record<string, never> }) => {
    const name = command.constructor.name;
    const input = command.input as Record<string, unknown>;

    if (name === 'HeadObjectCommand') {
      const facts = objects.get(String(input.Key));
      if (!facts) throw new NotFound();
      return { ContentLength: facts.contentLength, ContentType: facts.contentType };
    }

    if (name === 'ListObjectsV2Command') {
      const prefix = String(input.Prefix);
      return {
        Contents: [...objects.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((Key) => ({ Key })),
        IsTruncated: false,
      };
    }

    if (name === 'DeleteObjectsCommand') {
      const toDelete = (input.Delete as { Objects: { Key: string }[] }).Objects;
      for (const { Key } of toDelete) {
        objects.delete(Key);
        deletedKeys.push(Key);
      }
      return {};
    }

    throw new Error(`fakeS3 received an unexpected command: ${name}`);
  };

  return { client: { send } as unknown as S3Client, objects, deletedKeys };
}

export interface FakeTextract {
  client: TextractClient;
  /** Keys requested, in order. Lets a test prove Textract was not called at all. */
  requestedKeys: string[];
}

/**
 * @param documentsByKey OCR lines to return for each object key.
 * @param failFor        Object key that should make Textract throw.
 */
export function fakeTextract(
  documentsByKey: Record<string, OcrDocument>,
  failFor?: string,
): FakeTextract {
  const requestedKeys: string[] = [];

  const send = async (command: { input: Record<string, never> }) => {
    const input = command.input as {
      Document?: { S3Object?: { Name?: string } };
    };
    const key = String(input.Document?.S3Object?.Name);
    requestedKeys.push(key);

    if (failFor !== undefined && key === failFor) {
      const error = new Error('Textract is unavailable');
      error.name = 'InternalServerError';
      throw error;
    }

    const document = documentsByKey[key];
    if (!document) throw new Error(`fakeTextract has no document for key ${key}`);

    return {
      Blocks: document.lines.map((line) => ({
        BlockType: 'LINE',
        Text: line.text,
        Confidence: line.confidence,
      })),
    };
  };

  return { client: { send } as unknown as TextractClient, requestedKeys };
}

export interface FakeBedrockOptions {
  /** Raw text the model returns. */
  text?: string;
  /** Make the call throw instead. */
  fail?: boolean;
}

export interface FakeBedrock {
  client: BedrockRuntimeClient;
  calls: number;
}

export function fakeBedrock(options: FakeBedrockOptions = {}): FakeBedrock {
  const state = { calls: 0 };

  const send = async () => {
    state.calls += 1;
    if (options.fail) {
      const error = new Error('Bedrock is unavailable');
      error.name = 'ServiceUnavailableException';
      throw error;
    }
    return {
      output: { message: { content: [{ text: options.text ?? '' }] } },
      usage: { inputTokens: 100, outputTokens: 50 },
    };
  };

  return {
    client: { send } as unknown as BedrockRuntimeClient,
    get calls() {
      return state.calls;
    },
  };
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  AnalysisOutcome,
  DocumentType,
  ExplanationSource,
  Language,
} from '@kagazready/contracts';
import { config } from '../config.js';

/**
 * DynamoDB adapter — one table, two kinds of item.
 *
 * Every item carries `expiresAt`, the table's TTL attribute, so stored results delete themselves
 * within hours whether or not anyone calls the deletion endpoint. Nothing here is a long-lived
 * record: there are no user accounts and no history.
 */

let client: DynamoDBDocumentClient | undefined;
const table = (): DynamoDBDocumentClient =>
  (client ??= DynamoDBDocumentClient.from(new DynamoDBClient({ region: config().region }), {
    marshallOptions: { removeUndefinedValues: true },
  }));

/** Test seam. */
export function setDocumentClient(next: DynamoDBDocumentClient | undefined): void {
  client = next;
}

export type AnalysisState = 'processing' | 'complete';

export interface StoredExplanation {
  text: string;
  source: ExplanationSource;
}

export interface StoredAnalysis {
  pk: string;
  analysisId: string;
  state: AnalysisState;
  language: Language;
  templateId: string;
  templateVersion: string;
  /** documentType to the S3 object key currently in use for it. */
  documents: Partial<Record<DocumentType, string>>;
  outcome: AnalysisOutcome | null;
  /** Keyed by language, then by finding id. Cached so a language switch is free. */
  explanations: Partial<Record<Language, Record<string, StoredExplanation>>>;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
}

const analysisKey = (analysisId: string) => `analysis#${analysisId}`;
const counterKey = (isoDay: string) => `cap#${isoDay}`;

const expiryFromNow = (): number => Math.floor(Date.now() / 1000) + config().analysisTtlSeconds;

/** True when the item was created; false when one already existed. */
export async function createProcessingAnalysis(input: {
  analysisId: string;
  language: Language;
  templateId: string;
  templateVersion: string;
  documents: Partial<Record<DocumentType, string>>;
}): Promise<boolean> {
  const now = new Date().toISOString();
  const item: StoredAnalysis = {
    pk: analysisKey(input.analysisId),
    analysisId: input.analysisId,
    state: 'processing',
    language: input.language,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    documents: input.documents,
    outcome: null,
    explanations: {},
    createdAt: now,
    updatedAt: now,
    expiresAt: expiryFromNow(),
  };

  try {
    await table().send(
      new PutCommand({
        TableName: config().tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
    return true;
  } catch (error) {
    if (isConditionFailure(error)) return false;
    throw error;
  }
}

export async function getAnalysis(analysisId: string): Promise<StoredAnalysis | null> {
  const result = await table().send(
    new GetCommand({ TableName: config().tableName, Key: { pk: analysisKey(analysisId) } }),
  );
  const item = result.Item as StoredAnalysis | undefined;
  if (!item) return null;

  // TTL deletion is not instantaneous, so an item can outlive its own expiry by a few minutes.
  // Treat it as gone the moment it expires.
  if (item.expiresAt * 1000 <= Date.now()) return null;
  return item;
}

export async function completeAnalysis(input: {
  analysisId: string;
  outcome: AnalysisOutcome;
  documents: Partial<Record<DocumentType, string>>;
  language: Language;
  explanations: Record<string, StoredExplanation>;
}): Promise<StoredAnalysis> {
  const result = await table().send(
    new UpdateCommand({
      TableName: config().tableName,
      Key: { pk: analysisKey(input.analysisId) },
      UpdateExpression:
        'SET #state = :complete, outcome = :outcome, documents = :documents, #language = :language, explanations.#lang = :explanations, updatedAt = :now',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeNames: {
        '#state': 'state',
        '#language': 'language',
        '#lang': input.language,
      },
      ExpressionAttributeValues: {
        ':complete': 'complete',
        ':outcome': input.outcome,
        ':documents': input.documents,
        ':language': input.language,
        ':explanations': input.explanations,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }),
  );

  return result.Attributes as StoredAnalysis;
}

/** Cache explanations for a language the user switched to after the analysis ran. */
export async function putExplanations(
  analysisId: string,
  language: Language,
  explanations: Record<string, StoredExplanation>,
): Promise<void> {
  await table().send(
    new UpdateCommand({
      TableName: config().tableName,
      Key: { pk: analysisKey(analysisId) },
      UpdateExpression: 'SET explanations.#lang = :explanations, updatedAt = :now',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeNames: { '#lang': language },
      ExpressionAttributeValues: {
        ':explanations': explanations,
        ':now': new Date().toISOString(),
      },
    }),
  );
}

/** Roll an analysis back to processing so a failed run cannot leave it stuck. */
export async function markProcessing(analysisId: string): Promise<void> {
  await table().send(
    new UpdateCommand({
      TableName: config().tableName,
      Key: { pk: analysisKey(analysisId) },
      UpdateExpression: 'SET #state = :processing, updatedAt = :now',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: {
        ':processing': 'processing',
        ':now': new Date().toISOString(),
      },
    }),
  );
}

export async function deleteAnalysis(analysisId: string): Promise<void> {
  await table().send(
    new DeleteCommand({ TableName: config().tableName, Key: { pk: analysisKey(analysisId) } }),
  );
}

/**
 * Count one analysis against today's cap, atomically.
 *
 * The condition is the cap: DynamoDB refuses the increment once the count reaches it, so the limit
 * holds even with concurrent requests. Returns false when today is full — the caller must then not
 * call Textract at all, which is the point.
 */
export async function reserveDailyAnalysisSlot(now = new Date()): Promise<boolean> {
  const isoDay = now.toISOString().slice(0, 10);
  const cap = config().dailyAnalysisCap;

  try {
    await table().send(
      new UpdateCommand({
        TableName: config().tableName,
        Key: { pk: counterKey(isoDay) },
        UpdateExpression: 'SET expiresAt = if_not_exists(expiresAt, :expiresAt) ADD #count :one',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :cap',
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {
          ':one': 1,
          ':cap': cap,
          // Keep the counter a little past midnight UTC, then let TTL remove it.
          ':expiresAt': Math.floor(now.getTime() / 1000) + 36 * 60 * 60,
        },
      }),
    );
    return true;
  } catch (error) {
    if (isConditionFailure(error)) return false;
    throw error;
  }
}

function isConditionFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    String(error.name) === 'ConditionalCheckFailedException'
  );
}

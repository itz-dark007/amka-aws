import { DynamoDBClient, DescribeTableCommand, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Notice, AuditEntry, ParentUser } from '../src/types';

export interface DynamoConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  tableName: string;
}

let ddbClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;
let tableSchemaInfo: { partitionKey: string; sortKey?: string } | null = null;
let tableReady = false;

export function getDynamoConfig(): DynamoConfig {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim() || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim() || undefined,
    tableName: process.env.DYNAMODB_TABLE_NAME?.trim() || 'amka_campus_notices',
  };
}

export function isDynamoConfigured(): boolean {
  const cfg = getDynamoConfig();
  return Boolean(cfg.accessKeyId && cfg.secretAccessKey);
}

export function getDocClient(): DynamoDBDocumentClient | null {
  if (!isDynamoConfigured()) return null;

  if (!docClient) {
    const cfg = getDynamoConfig();
    ddbClient = new DynamoDBClient({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId!,
        secretAccessKey: cfg.secretAccessKey!,
      },
    });

    docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }
  return docClient;
}

/**
 * Verifies or auto-creates the DynamoDB table if it does not yet exist.
 */
export async function ensureTable(): Promise<{ ready: boolean; error?: string }> {
  if (!isDynamoConfigured()) {
    return { ready: false, error: 'AWS DynamoDB credentials are not configured in environment.' };
  }

  const client = getDocClient();
  if (!client || !ddbClient) {
    return { ready: false, error: 'Could not initialize AWS DynamoDB client.' };
  }

  const cfg = getDynamoConfig();

  try {
    const describe = await ddbClient.send(new DescribeTableCommand({ TableName: cfg.tableName }));
    const keySchema = describe.Table?.KeySchema || [];
    const pk = keySchema.find((k) => k.KeyType === 'HASH')?.AttributeName || 'id';
    const sk = keySchema.find((k) => k.KeyType === 'RANGE')?.AttributeName;

    tableSchemaInfo = { partitionKey: pk, sortKey: sk };
    tableReady = true;
    return { ready: true };
  } catch (err: any) {
    if (err.name === 'ResourceNotFoundException') {
      try {
        console.log(`[DynamoDB] Table "${cfg.tableName}" not found. Creating table with on-demand capacity...`);
        await ddbClient.send(
          new CreateTableCommand({
            TableName: cfg.tableName,
            BillingMode: 'PAY_PER_REQUEST',
            AttributeDefinitions: [
              { AttributeName: 'id', AttributeType: 'S' },
            ],
            KeySchema: [
              { AttributeName: 'id', KeyType: 'HASH' },
            ],
          })
        );

        tableSchemaInfo = { partitionKey: 'id' };
        tableReady = true;
        console.log(`[DynamoDB] Table "${cfg.tableName}" created successfully.`);
        return { ready: true };
      } catch (createErr: any) {
        console.error('[DynamoDB] Failed to auto-create table:', createErr);
        return { ready: false, error: `Failed to create table: ${createErr.message}` };
      }
    }

    console.error('[DynamoDB] Error verifying table:', err);
    return { ready: false, error: err.message || 'Error connecting to DynamoDB' };
  }
}

function buildKey(id: string, entityType: string): Record<string, any> {
  const pkName = tableSchemaInfo?.partitionKey || 'id';
  const skName = tableSchemaInfo?.sortKey;

  const key: Record<string, any> = {};
  if (pkName === 'pk' && skName === 'sk') {
    key['pk'] = entityType.toUpperCase();
    key['sk'] = id;
  } else {
    key[pkName] = id;
    if (skName) {
      key[skName] = entityType;
    }
  }
  return key;
}

// ----------------- NOTICE CRUD ----------------- //

export async function putNoticeToDynamo(notice: Notice): Promise<boolean> {
  const client = getDocClient();
  if (!client) return false;
  const cfg = getDynamoConfig();

  try {
    const key = buildKey(notice.id, 'notice');
    const item = {
      ...notice,
      ...key,
      entityType: 'notice',
    };

    await client.send(
      new PutCommand({
        TableName: cfg.tableName,
        Item: item,
      })
    );
    return true;
  } catch (err: any) {
    console.error(`[DynamoDB] Failed to put notice ${notice.id}:`, err?.message || err);
    return false;
  }
}

export async function deleteNoticeFromDynamo(id: string): Promise<boolean> {
  const client = getDocClient();
  if (!client) return false;
  const cfg = getDynamoConfig();

  try {
    const key = buildKey(id, 'notice');
    await client.send(
      new DeleteCommand({
        TableName: cfg.tableName,
        Key: key,
      })
    );
    return true;
  } catch (err: any) {
    console.error(`[DynamoDB] Failed to delete notice ${id}:`, err?.message || err);
    return false;
  }
}

export async function fetchAllNoticesFromDynamo(): Promise<Notice[] | null> {
  const client = getDocClient();
  if (!client) return null;
  const cfg = getDynamoConfig();

  try {
    const res = await client.send(
      new ScanCommand({
        TableName: cfg.tableName,
        FilterExpression: 'entityType = :type OR begins_with(id, :prefix)',
        ExpressionAttributeValues: {
          ':type': 'notice',
          ':prefix': 'not_',
        },
      })
    );

    if (!res.Items || res.Items.length === 0) {
      return [];
    }

    return (res.Items as Notice[]).filter((n) => n.id && n.title);
  } catch (err: any) {
    console.error('[DynamoDB] Failed to scan notices:', err?.message || err);
    return null;
  }
}

// ----------------- AUDIT CRUD ----------------- //

export async function putAuditToDynamo(entry: AuditEntry): Promise<boolean> {
  const client = getDocClient();
  if (!client) return false;
  const cfg = getDynamoConfig();

  try {
    const key = buildKey(entry.id, 'audit');
    const item = {
      ...entry,
      ...key,
      entityType: 'audit',
    };

    await client.send(
      new PutCommand({
        TableName: cfg.tableName,
        Item: item,
      })
    );
    return true;
  } catch (err: any) {
    console.error(`[DynamoDB] Failed to save audit log ${entry.id}:`, err?.message || err);
    return false;
  }
}

export async function fetchAllAuditsFromDynamo(): Promise<AuditEntry[] | null> {
  const client = getDocClient();
  if (!client) return null;
  const cfg = getDynamoConfig();

  try {
    const res = await client.send(
      new ScanCommand({
        TableName: cfg.tableName,
        FilterExpression: 'entityType = :type OR begins_with(id, :prefix)',
        ExpressionAttributeValues: {
          ':type': 'audit',
          ':prefix': 'aud_',
        },
      })
    );

    if (!res.Items || res.Items.length === 0) {
      return [];
    }

    return (res.Items as AuditEntry[]).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (err: any) {
    console.error('[DynamoDB] Failed to scan audits:', err?.message || err);
    return null;
  }
}

// ----------------- PARENT CRUD ----------------- //

export async function putParentToDynamo(parent: ParentUser): Promise<boolean> {
  const client = getDocClient();
  if (!client) return false;
  const cfg = getDynamoConfig();

  try {
    const key = buildKey(parent.id, 'parent');
    const item = {
      ...parent,
      ...key,
      entityType: 'parent',
    };

    await client.send(
      new PutCommand({
        TableName: cfg.tableName,
        Item: item,
      })
    );
    return true;
  } catch (err: any) {
    console.error(`[DynamoDB] Failed to save parent ${parent.id}:`, err?.message || err);
    return false;
  }
}

export async function fetchAllParentsFromDynamo(): Promise<ParentUser[] | null> {
  const client = getDocClient();
  if (!client) return null;
  const cfg = getDynamoConfig();

  try {
    const res = await client.send(
      new ScanCommand({
        TableName: cfg.tableName,
        FilterExpression: 'entityType = :type OR begins_with(id, :prefix)',
        ExpressionAttributeValues: {
          ':type': 'parent',
          ':prefix': 'prnt_',
        },
      })
    );

    if (!res.Items || res.Items.length === 0) {
      return [];
    }

    return res.Items as ParentUser[];
  } catch (err: any) {
    console.error('[DynamoDB] Failed to scan parents:', err?.message || err);
    return null;
  }
}

// ----------------- HEALTH & DIAGNOSTICS ----------------- //

export async function getDynamoStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  region: string;
  tableName: string;
  maskedAccessKey?: string;
  itemCount?: number;
  tableStatus?: string;
  error?: string;
}> {
  const cfg = getDynamoConfig();
  const configured = isDynamoConfigured();

  const masked = cfg.accessKeyId
    ? `${cfg.accessKeyId.slice(0, 4)}••••${cfg.accessKeyId.slice(-4)}`
    : undefined;

  if (!configured) {
    return {
      configured: false,
      connected: false,
      region: cfg.region,
      tableName: cfg.tableName,
      error: 'AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not set.',
    };
  }

  try {
    const check = await ensureTable();
    if (!check.ready) {
      return {
        configured: true,
        connected: false,
        region: cfg.region,
        tableName: cfg.tableName,
        maskedAccessKey: masked,
        error: check.error,
      };
    }

    const client = getDocClient();
    if (!client) {
      return {
        configured: true,
        connected: false,
        region: cfg.region,
        tableName: cfg.tableName,
        maskedAccessKey: masked,
        error: 'Failed to initialize document client.',
      };
    }

    const countRes = await client.send(
      new ScanCommand({
        TableName: cfg.tableName,
        Select: 'COUNT',
      })
    );

    return {
      configured: true,
      connected: true,
      region: cfg.region,
      tableName: cfg.tableName,
      maskedAccessKey: masked,
      itemCount: countRes.Count ?? 0,
      tableStatus: 'ACTIVE',
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      region: cfg.region,
      tableName: cfg.tableName,
      maskedAccessKey: masked,
      error: err.message || 'Connection test failed',
    };
  }
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, BatchGetCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME || `${process.env.SERVERLESS_SERVICE || 'service'}-properties-table`;

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

import { toProperty, toPost, toPostsListApi, toPostApi } from './transformers'

// API shapes
export type Property = {
  id: string;
  title: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: any;
};

export type Photo = { id?: string; url?: string };

export type Post = {
  id: string;
  title?: string | null;
  body: string | null;
  photos: Photo[];
  propertyId?: string | null;
  scheduled_at?: string | null;
};

export type PostApi = {
  id: string;
  title?: string | null;
  body: string | null;
  photos: Photo[];
  property: { id: string; address?: string | null; title?: string | null } | null;
  scheduled_at?: string | null;
};

// mapping functions moved to src/lib/transformers.ts

export async function listProperties(): Promise<Property[]> {
  const resp = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'EntityTypeIndex',
    KeyConditionExpression: '#et = :ptype',
    ExpressionAttributeNames: { '#et': 'entityType' },
    ExpressionAttributeValues: { ':ptype': 'PROPERTY' },
  }));

  const props = (resp.Items || []).map(toProperty).filter((p): p is Property => p != null);
  return props;
}

export async function getProperty(id: string): Promise<Property | null> {
  const PK = `PROPERTY#${id}`;
  const SK = `METADATA#${id}`;
  const resp = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK, SK } }));
  return toProperty(resp.Item);
}

export async function createProperty(data: { title: string; address: string; latitude: number; longitude: number; metadata?: any }, opts?: { id?: string }): Promise<Property> {
  const id = opts && opts.id ? opts.id : uuidv4();
  const item: any = {
    PK: `PROPERTY#${id}`,
    SK: `METADATA#${id}`,
    entityType: 'PROPERTY',
    propertyId: id,
    title: data.title,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    metadata: data.metadata || {},
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return toProperty(item) as Property;
}

export async function listPosts(): Promise<PostApi[]> {
  const resp = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'EntityTypeIndex',
    KeyConditionExpression: '#et = :ptype',
    ExpressionAttributeNames: { '#et': 'entityType' },
    ExpressionAttributeValues: { ':ptype': 'POST' },
  }));

  type PostItem = NonNullable<ReturnType<typeof toPost>>;

  const posts = (resp.Items || []).map(toPost).filter((p): p is PostItem => p != null);

  // collect unique propertyIds and batch-get them
  const propIds = Array.from(new Set(posts.map(p => p.propertyId).filter(Boolean))) as string[];
  let propertyMap: Record<string, Property | null> = {};
  if (propIds.length > 0) {
    const keys = propIds.map(id => ({ PK: `PROPERTY#${id}`, SK: `METADATA#${id}` }));
    const batchResp: any = await docClient.send(new BatchGetCommand({ RequestItems: { [TABLE_NAME]: { Keys: keys } } }));
    const items = (batchResp.Responses && batchResp.Responses[TABLE_NAME]) || [];
    const mapped = (items.map(toProperty) as Array<Property | null>).filter((x): x is Property => !!x);
    propertyMap = Object.fromEntries(mapped.map(p => [p.id, p]));
  }

  return toPostsListApi(posts, propertyMap)
}

export async function removeAllByEntity(entityType: string, opts?: { dryRun?: boolean }): Promise<number> {
  const keys: Array<{ PK: string; SK: string }> = [];
  let ExclusiveStartKey: any = undefined;
  do {
    const resp: any = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'EntityTypeIndex',
      KeyConditionExpression: '#et = :ptype',
      ExpressionAttributeNames: { '#et': 'entityType' },
      ExpressionAttributeValues: { ':ptype': entityType },
      ExclusiveStartKey,
      ProjectionExpression: 'PK, SK',
    }));
    for (const it of (resp.Items || [])) keys.push({ PK: it.PK, SK: it.SK });
    ExclusiveStartKey = resp.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  if (opts && opts.dryRun) {
    // return count for dry run
    return keys.length;
  }

  if (keys.length === 0) return 0;

  for (let i = 0; i < keys.length; i += 25) {
    const chunk = keys.slice(i, i + 25);
    const RequestItems: any = {};
    RequestItems[TABLE_NAME] = chunk.map(k => ({ DeleteRequest: { Key: { PK: k.PK, SK: k.SK } } }));
    await docClient.send(new BatchWriteCommand({ RequestItems }));
  }

  return keys.length;
}

export async function removeAllFromTable(opts?: { dryRun?: boolean }): Promise<number> {
  const keys: Array<{ PK: string; SK: string }> = [];
  let ExclusiveStartKey: any = undefined;
  do {
    const resp: any = await docClient.send(new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey, ProjectionExpression: 'PK, SK' }));
    for (const it of (resp.Items || [])) keys.push({ PK: it.PK, SK: it.SK });
    ExclusiveStartKey = resp.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  if (opts && opts.dryRun) return keys.length;
  if (keys.length === 0) return 0;

  for (let i = 0; i < keys.length; i += 25) {
    const chunk = keys.slice(i, i + 25);
    const RequestItems: any = {};
    RequestItems[TABLE_NAME] = chunk.map(k => ({ DeleteRequest: { Key: { PK: k.PK, SK: k.SK } } }));
    await docClient.send(new BatchWriteCommand({ RequestItems }));
  }

  return keys.length;
}

export async function getPost(id: string): Promise<PostApi | null> {
  const PK = `POST#${id}`;
  const SK = `METADATA#${id}`;
  const resp = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK, SK } }));
  const p = toPost(resp.Item);
  if (!p) return null;
  if (p.propertyId) {
    const prop = await getProperty(p.propertyId);
    return toPostApi(p, prop ? { id: prop.id, address: prop.address, title: prop.title } : { id: p.propertyId, title: null })
  }
  return toPostApi(p, null)
}

export async function createPost(data: { body: string; photos?: Array<{ url: string; id?: string }>; propertyId?: string; scheduled_at?: string }): Promise<PostApi> {
  const id = uuidv4();
  const item: any = {
    PK: `POST#${id}`,
    SK: `METADATA#${id}`,
    entityType: 'POST',
    postId: id,
    body: data.body,
    title: (data as any).title || null,
    createdAt: new Date().toISOString(),
  };
  // Allow callers to set an explicit id via a reserved field in data (internal use)
  // If caller provided `data._id` we'll use it (not part of public API)
  if ((data as any)._id) {
    item.postId = (data as any)._id;
    item.PK = `POST#${(data as any)._id}`;
    item.SK = `METADATA#${(data as any)._id}`;
  }
  if (data.propertyId) item.propertyId = data.propertyId;
  if (Array.isArray(data.photos)) item.photos = data.photos.map((p, idx) => ({ id: p.id || `${id}-p${idx+1}`, url: p.url }));
  if (data.scheduled_at) item.scheduledAt = data.scheduled_at;

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  const created = {
    id: item.postId,
    title: item.title || null,
    body: item.body,
    photos: item.photos || [],
    scheduled_at: item.scheduledAt || null,
  }
  return toPostApi(created, item.propertyId ? { id: item.propertyId } : null)
}

export default {
  listProperties,
  getProperty,
  createProperty,
  listPosts,
  getPost,
  createPost,
};

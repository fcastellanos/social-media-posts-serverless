import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME || `${process.env.SERVERLESS_SERVICE || 'service'}-properties-table`;

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// API shapes
export type Property = {
  id: string;
  title: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  metadata: any;
};

export type Photo = { id?: string; url?: string };

export type Post = {
  id: string;
  body: string | null;
  photos: Photo[];
  propertyId?: string | null;
  scheduled_at?: string | null;
};

export type PostApi = {
  id: string;
  body: string | null;
  photos: Photo[];
  property: { id: string; address?: string | null } | null;
  scheduled_at?: string | null;
};

function mapPropertyItem(it: any): Property | null {
  if (!it) return null;
  return {
    id: it.propertyId,
    title: it.title || it.name || null,
    address: it.address || null,
    lat: typeof it.lat === 'number' ? it.lat : (typeof it.latitude === 'number' ? it.latitude : null),
    lng: typeof it.lng === 'number' ? it.lng : (typeof it.longitude === 'number' ? it.longitude : null),
    metadata: it.metadata || {},
  };
}

function mapPostItem(it: any): Post | null {
  if (!it) return null;
  return {
    id: it.postId,
    body: it.body ?? it.content ?? null,
    photos: (it.photos || []).map((p: any) => ({ id: p.id, url: p.url })),
    propertyId: it.propertyId || null,
    scheduled_at: it.scheduledAt || null,
  };
}

export async function listProperties(): Promise<Property[]> {
  const resp = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'EntityTypeIndex',
    KeyConditionExpression: '#et = :ptype',
    ExpressionAttributeNames: { '#et': 'entityType' },
    ExpressionAttributeValues: { ':ptype': 'PROPERTY' },
  }));

  const props = (resp.Items || []).map(mapPropertyItem).filter((p): p is Property => p != null);
  return props;
}

export async function getProperty(id: string): Promise<Property | null> {
  const PK = `PROPERTY#${id}`;
  const SK = `METADATA#${id}`;
  const resp = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK, SK } }));
  return mapPropertyItem(resp.Item);
}

export async function createProperty(data: { title: string; address: string; lat: number; lng: number; metadata?: any }): Promise<Property> {
  const id = uuidv4();
  const item: any = {
    PK: `PROPERTY#${id}`,
    SK: `METADATA#${id}`,
    entityType: 'PROPERTY',
    propertyId: id,
    title: data.title,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    metadata: data.metadata || {},
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return mapPropertyItem(item) as Property;
}

export async function listPosts(): Promise<PostApi[]> {
  const resp = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'EntityTypeIndex',
    KeyConditionExpression: '#et = :ptype',
    ExpressionAttributeNames: { '#et': 'entityType' },
    ExpressionAttributeValues: { ':ptype': 'POST' },
  }));

  type PostItem = NonNullable<ReturnType<typeof mapPostItem>>;

  const posts = (resp.Items || []).map(mapPostItem).filter((p): p is PostItem => p != null);

  // collect unique propertyIds and batch-get them
  const propIds = Array.from(new Set(posts.filter(p => p.propertyId).map(p => p.propertyId)));
  const propertyMap: Record<string, Property | null> = {};
  if (propIds.length > 0) {
    const keys = propIds.map(id => ({ PK: `PROPERTY#${id}`, SK: `METADATA#${id}` }));
    const batchResp: any = await docClient.send(new BatchGetCommand({ RequestItems: { [TABLE_NAME]: { Keys: keys } } }));
    const items = (batchResp.Responses && batchResp.Responses[TABLE_NAME]) || [];
    for (const it of items) propertyMap[it.propertyId] = mapPropertyItem(it);
  }

  return posts.map(p => ({
    id: p.id,
    body: p.body,
    photos: p.photos || [],
    property: p.propertyId ? (propertyMap[p.propertyId] ? { id: propertyMap[p.propertyId]!.id, address: propertyMap[p.propertyId]!.address } : { id: p.propertyId }) : null,
    scheduled_at: p.scheduled_at || null,
  }));
}

export async function getPost(id: string): Promise<PostApi | null> {
  const PK = `POST#${id}`;
  const SK = `METADATA#${id}`;
  const resp = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK, SK } }));
  const p = mapPostItem(resp.Item);
  if (!p) return null;
  if (p.propertyId) {
    const prop = await getProperty(p.propertyId);
    return { id: p.id, body: p.body, photos: p.photos || [], property: prop ? { id: prop.id, address: prop.address } : { id: p.propertyId }, scheduled_at: p.scheduled_at };
  }
  return { id: p.id, body: p.body, photos: p.photos || [], property: null, scheduled_at: p.scheduled_at };
}

export async function createPost(data: { body: string; photos?: Array<{ url: string; id?: string }>; propertyId?: string; scheduled_at?: string }): Promise<PostApi> {
  const id = uuidv4();
  const item: any = {
    PK: `POST#${id}`,
    SK: `METADATA#${id}`,
    entityType: 'POST',
    postId: id,
    body: data.body,
    createdAt: new Date().toISOString(),
  };
  if (data.propertyId) item.propertyId = data.propertyId;
  if (Array.isArray(data.photos)) item.photos = data.photos.map((p, idx) => ({ id: p.id || `${id}-p${idx+1}`, url: p.url }));
  if (data.scheduled_at) item.scheduledAt = data.scheduled_at;

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  return {
    id: item.postId,
    body: item.body,
    photos: item.photos || [],
    property: item.propertyId ? { id: item.propertyId } : null,
    scheduled_at: item.scheduledAt || null,
  };
}

export default {
  listProperties,
  getProperty,
  createProperty,
  listPosts,
  getPost,
  createPost,
};

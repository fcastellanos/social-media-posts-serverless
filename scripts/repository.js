const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, BatchGetCommand, QueryCommand, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const fs = require('fs');
const path = require('path');

const TABLE = process.env.PROPERTIES_TABLE_NAME;
const REGION = process.env.AWS_REGION || 'us-east-1';
// Keep credential resolution to the AWS SDK default provider chain.
// Do not attempt to auto-select or mutate `AWS_PROFILE` here — rely on the environment
// (or run seeds inside the Serverless process so credentials are already available).

if (!TABLE) {
  console.error('PROPERTIES_TABLE_NAME is required for scripts/repository.js');
}

// Allow using a local DynamoDB endpoint for development via DYNAMODB_ENDPOINT
const clientOpts = { region: REGION };
if (process.env.DYNAMODB_ENDPOINT) clientOpts.endpoint = process.env.DYNAMODB_ENDPOINT;

const client = new DynamoDBClient(clientOpts);
const docClient = DynamoDBDocumentClient.from(client);

// Credential availability is resolved by the AWS SDK default chain; do not attempt
// to assert or mutate credentials in this module.

function confirmPrompt(message) {
  return new Promise((resolve) => {
    try {
      if (!process.stdin.isTTY) return resolve(false);
    } catch (e) {
      return resolve(false);
    }
    process.stdout.write(`${message}. Type YES to confirm: `);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', function (data) {
      const val = String(data || '').trim();
      process.stdin.pause();
      resolve(val === 'YES');
    });
  });
}

async function createProperty(data, opts = {}) {
  const id = opts.id || uuidv4();
  const item = {
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

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { propertyId: id };
}

async function createPost(data, opts = {}) {
  const id = opts.id || uuidv4();
  const item = {
    PK: `POST#${id}`,
    SK: `METADATA#${id}`,
    entityType: 'POST',
    postId: id,
    body: data.body,
    title: data.title || null,
    createdAt: new Date().toISOString(),
  };
  if (data.propertyId) item.propertyId = data.propertyId;
  if (Array.isArray(data.photos)) item.photos = data.photos.map((p, idx) => ({ id: p.id || `${id}-p${idx+1}`, url: p.url }));
  if (data.scheduled_at) item.scheduledAt = data.scheduled_at;

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { postId: id };
}

async function batchDeleteKeys(keys) {
  // keys: array of { PK, SK }
  const chunks = [];
  for (let i = 0; i < keys.length; i += 25) chunks.push(keys.slice(i, i + 25));
  for (const chunk of chunks) {
    const requestItems = chunk.map(k => ({ DeleteRequest: { Key: { PK: k.PK, SK: k.SK } } }));
    await docClient.send(new BatchWriteCommand({ RequestItems: { [TABLE]: requestItems } }));
  }
}

async function removeAllByEntity(entityType, opts = {}) {
  // use EntityTypeIndex to query all items of a given entity type
  const keys = [];
  let ExclusiveStartKey = undefined;
  // credential resolution is handled by the AWS SDK at client call time
  try {
    do {
      const resp = await docClient.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'EntityTypeIndex',
        KeyConditionExpression: '#et = :ptype',
        ExpressionAttributeNames: { '#et': 'entityType' },
        ExpressionAttributeValues: { ':ptype': entityType },
        ExclusiveStartKey,
      }));
      for (const it of (resp.Items || [])) keys.push({ PK: it.PK, SK: it.SK });
      ExclusiveStartKey = resp.LastEvaluatedKey;
    } while (ExclusiveStartKey);
  } catch (err) {
    if (opts.dryRun) {
      console.log(`DRY RUN - unable to query table (no credentials or unreachable): ${String(err.message || err)}`);
      return 0;
    }
    throw err;
  }

  if (opts.dryRun) {
    console.log(`DRY RUN - would delete ${keys.length} items of type ${entityType}`);
    return keys.length;
  }

  if (keys.length === 0) return 0;

  // require explicit FORCE=true to skip confirmation in non-interactive environments
  if (process.env.FORCE !== 'true') {
    const proceed = await confirmPrompt(`Delete ${keys.length} items of type ${entityType}`);
    if (!proceed) {
      console.log('Aborted by user');
      return 0;
    }
  }

  await batchDeleteKeys(keys);
  return keys.length;
}

async function removeAllPosts(opts = {}) {
  return removeAllByEntity('POST', opts);
}

async function removeAllProperties(opts = {}) {
  return removeAllByEntity('PROPERTY', opts);
}

async function removeAllFromTable(opts = {}) {
  // scan full table for PK/SK and delete in batches
  const keys = [];
  let ExclusiveStartKey = undefined;
  // credential resolution is handled by the AWS SDK at client call time
  do {
    try {
      const resp = await docClient.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey, ProjectionExpression: 'PK, SK' }));
      for (const it of (resp.Items || [])) keys.push({ PK: it.PK, SK: it.SK });
      ExclusiveStartKey = resp.LastEvaluatedKey;
    } catch (err) {
      if (opts.dryRun) {
        console.log(`DRY RUN - unable to scan table (no credentials or unreachable): ${String(err.message || err)}`);
        return 0;
      }
      throw err;
    }
  } while (ExclusiveStartKey);

  if (opts.dryRun) {
    console.log(`DRY RUN - would delete ${keys.length} items from table ${TABLE}`);
    return keys.length;
  }

  if (keys.length === 0) return 0;

  if (process.env.FORCE !== 'true') {
    const proceed = await confirmPrompt(`Delete ${keys.length} items from table ${TABLE}`);
    if (!proceed) {
      console.log('Aborted by user');
      return 0;
    }
  }

  await batchDeleteKeys(keys);
  return keys.length;
}

module.exports = { createProperty, createPost, removeAllPosts, removeAllProperties, removeAllFromTable };

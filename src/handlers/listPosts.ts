import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { json, internalError } from '../lib/http';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME || `${process.env.SERVERLESS_SERVICE || 'service'}-properties-table`;

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const resp = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'EntityTypeIndex',
      KeyConditionExpression: '#et = :ptype',
      ExpressionAttributeNames: { '#et': 'entityType' },
      ExpressionAttributeValues: { ':ptype': 'POST' },
    }));

    const items = resp.Items || [];

    // For posts that reference a property, fetch the property address
    const result = await Promise.all(items.map(async (it: any) => {
      const post = {
        id: it.postId,
        body: it.body || it.content || null,
        photos: (it.photos || []).map((p: any, idx: number) => ({ id: p.id ?? `${it.postId}-p${idx+1}`, url: p.url })),
        property: null as any,
        scheduled_at: it.scheduledAt || null,
      };

      if (it.propertyId) {
        try {
          const pk = `PROPERTY#${it.propertyId}`;
          const sk = `METADATA#${it.propertyId}`;
          const g = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } }));
          if (g.Item) post.property = { id: g.Item.propertyId, address: g.Item.address || g.Item.address || (g.Item.title ? g.Item.title : null) };
          else post.property = { id: it.propertyId };
        } catch (e) {
          post.property = { id: it.propertyId };
        }
      }

      return post;
    }));

    return json(200, result);
  } catch (err: any) {
    return internalError(err);
  }
};

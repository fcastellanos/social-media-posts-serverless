import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { json, badRequest, internalError } from '../lib/http';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME || `${process.env.SERVERLESS_SERVICE || 'service'}-properties-table`;

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) return badRequest('Missing body');

    const body = JSON.parse(event.body);
    const required = ['title', 'content'];
    for (const key of required) {
      if (body[key] === undefined) return badRequest(`Missing ${key}`);
    }

    const id = uuidv4();
    const item: any = {
      PK: `POST#${id}`,
      SK: `METADATA#${id}`,
      entityType: 'POST',
      postId: id,
      title: body.title,
      content: body.content,
      createdAt: new Date().toISOString(),
    };

    if (body.propertyId) item.propertyId = body.propertyId;
    if (Array.isArray(body.photos)) item.photos = body.photos.map((p: any) => ({ url: p.url, caption: p.caption || null }));

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    return json(201, item);
  } catch (err: any) {
    return internalError(err);
  }
};

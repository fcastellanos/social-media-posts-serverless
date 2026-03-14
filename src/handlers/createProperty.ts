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
    const required = ['address', 'title', 'lat', 'lng'];
    for (const key of required) {
      if (body[key] === undefined) return badRequest(`Missing ${key}`);
    }

    const id = uuidv4();
    const item: any = {
      PK: `PROPERTY#${id}`,
      SK: `METADATA#${id}`,
      entityType: 'PROPERTY',
      propertyId: id,
      title: body.title,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      metadata: body.metadata || {},
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    // return API-shaped object
    const resp = {
      id: item.propertyId,
      title: item.title,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      metadata: item.metadata,
    };

    return json(201, resp);
  } catch (err: any) {
    return internalError(err);
  }
};

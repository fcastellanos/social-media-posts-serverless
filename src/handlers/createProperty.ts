import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME || `${process.env.SERVERLESS_SERVICE || 'service'}-properties-table`;

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Missing body' }) };
    }

    const body = JSON.parse(event.body);
    const required = ['address', 'city', 'latitude', 'longitude', 'name', 'state', 'zip'];
    for (const key of required) {
        if (body[key] === undefined) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Missing ${key}` }) };
      }
    }

    const id = uuidv4();
    const item: any = {
      PK: `PROPERTY#${id}`,
      SK: `METADATA#${id}`,
      entityType: 'PROPERTY',
      propertyId: id,
      address: body.address,
      city: body.city,
      latitude: body.latitude,
      longitude: body.longitude,
      name: body.name,
      state: body.state,
      zip: body.zip
    };

    if (body.description !== undefined) {
      item.description = body.description;
    }

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) };
  } catch (err: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: err.message || err }) };
  }
};

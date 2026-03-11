import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
      ExpressionAttributeValues: { ':ptype': 'PROPERTY' },
    }));

    return json(200, resp.Items || []);
  } catch (err: any) {
    return internalError(err);
  }
};

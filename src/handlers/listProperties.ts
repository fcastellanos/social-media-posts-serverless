import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { json, internalError } from '../lib/http';
import * as repo from '../lib/repository';

export const handler = async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const items = await repo.listProperties();
    return json(200, items);
  } catch (err: any) {
    return internalError(err);
  }
};

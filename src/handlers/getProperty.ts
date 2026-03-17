import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { json, badRequest, internalError } from '../lib/http';
import * as repo from '../lib/repository';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters && (event.pathParameters as any).id;
  if (!id) return badRequest('property id is required');

  try {
    const prop = await repo.getProperty(id);
    if (!prop) return json(404, { message: 'property not found' });
    return json(200, prop);
  } catch (err: any) {
    return internalError(err);
  }
};

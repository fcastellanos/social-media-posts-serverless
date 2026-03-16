import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { json, badRequest, internalError } from '../lib/http';
import * as repo from '../lib/repository';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) return badRequest('Missing body');

    const body = JSON.parse(event.body);
    if (body.body === undefined) return badRequest('Missing body');

    const created = await repo.createPost({ body: body.body, photos: body.photos, propertyId: body.property?.id, scheduled_at: body.scheduled_at });
    return json(201, created);
  } catch (err: any) {
    return internalError(err);
  }
};

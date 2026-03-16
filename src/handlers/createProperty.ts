import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { json, badRequest, internalError } from '../lib/http';
import * as repo from '../lib/repository';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) return badRequest('Missing body');

    const body = JSON.parse(event.body);
    if (body.address === undefined) return badRequest('Missing address');
    if (body.title === undefined && body.name === undefined) return badRequest('Missing title');
    if (body.lat === undefined && body.latitude === undefined) return badRequest('Missing lat');
    if (body.lng === undefined && body.longitude === undefined) return badRequest('Missing lng');

    const title = body.title || body.name;
    const lat = body.lat ?? body.latitude;
    const lng = body.lng ?? body.longitude;

    const prop = await repo.createProperty({ title, address: body.address, lat, lng, metadata: body.metadata });
    if (prop && (prop as any).id && !(prop as any).propertyId) (prop as any).propertyId = (prop as any).id;
    return json(201, prop);
  } catch (err: any) {
    return internalError(err);
  }
};

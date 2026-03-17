import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { json, badRequest, internalError } from '../lib/http';
import * as repo from '../lib/repository';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters && (event.pathParameters as any).id;
  if (!id) return badRequest('post id is required');

  try {
    const post = await repo.getPost(id);
    if (!post) return json(404, { message: 'post not found' });
    return json(200, post);
  } catch (err: any) {
    return internalError(err);
  }
};

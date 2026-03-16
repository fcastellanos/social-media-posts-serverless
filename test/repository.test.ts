import { describe, it, expect, vi } from 'vitest';

// Mock AWS DynamoDB Document client and commands used by repository
vi.mock('@aws-sdk/lib-dynamodb', () => {
  class QueryCommand { constructor(public input: any) {} }
  class GetCommand { constructor(public input: any) {} }
  class PutCommand { constructor(public input: any) {} }
  class BatchGetCommand { constructor(public input: any) {} }

  const DynamoDBDocumentClient = {
    from: () => ({
      send: async (cmd: any) => {
        // Query for properties
        if (cmd instanceof QueryCommand && cmd.input.IndexName === 'EntityTypeIndex') {
          if (cmd.input.ExpressionAttributeValues && cmd.input.ExpressionAttributeValues[':ptype'] === 'PROPERTY') {
            return { Items: [{ propertyId: 'p1', title: 'T', address: 'A', latitude: 1, longitude: 2 }] };
          }
          if (cmd.input.ExpressionAttributeValues && cmd.input.ExpressionAttributeValues[':ptype'] === 'POST') {
            return { Items: [{ postId: 'post1', body: 'b', photos: [], propertyId: 'p1', scheduledAt: null }] };
          }
        }
        // GetCommand for single items
        if (cmd instanceof GetCommand && cmd.input.Key && String(cmd.input.Key.PK).startsWith('PROPERTY#')) {
          return { Item: { propertyId: 'p1', title: 'T', address: 'A', latitude: 1, longitude: 2 } };
        }
        if (cmd instanceof BatchGetCommand) {
          const table = Object.keys(cmd.input.RequestItems || {})[0];
          return { Responses: { [table]: [{ propertyId: 'p1', title: 'T', address: 'A', latitude: 1, longitude: 2 }] } };
        }
        return {};
      }
    })
  };

  return { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, BatchGetCommand };
});

import * as repo from '../src/lib/repository';

describe('repository basic behaviors', () => {
  it('listProperties returns mapped properties', async () => {
    const props = await repo.listProperties();
    expect(Array.isArray(props)).toBe(true);
    expect(props[0].id).toBe('p1');
    expect(props[0].latitude).toBe(1);
  });

  it('listPosts returns posts with property populated', async () => {
    const posts = await repo.listPosts();
    expect(Array.isArray(posts)).toBe(true);
    expect(posts[0].id).toBe('post1');
    expect(posts[0].property).toBeTruthy();
    expect(posts[0].property?.id).toBe('p1');
  });
});

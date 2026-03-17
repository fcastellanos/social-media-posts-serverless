import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use a single mockBehavior function that tests can override per-case.
let mockBehavior: (cmd: any) => any = async () => ({});

vi.mock('@aws-sdk/lib-dynamodb', () => {
  class QueryCommand { constructor(public input: any) {} }
  class GetCommand { constructor(public input: any) {} }
  class PutCommand { constructor(public input: any) {} }
  class BatchGetCommand { constructor(public input: any) {} }
  class ScanCommand { constructor(public input: any) {} }
  class BatchWriteCommand { constructor(public input: any) {} }

  const DynamoDBDocumentClient = {
    from: () => ({
      send: async (cmd: any) => mockBehavior(cmd),
    }),
  };

  return { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, BatchGetCommand, ScanCommand, BatchWriteCommand };
});

import * as repo from '../src/lib/repository';

beforeEach(() => {
  // default behavior: support listProperties/listPosts and basic gets
  mockBehavior = async (cmd: any) => {
    // Heuristic-based matching rather than instanceof checks to avoid constructor identity issues.
    const input = cmd && cmd.input;
    if (input && input.IndexName === 'EntityTypeIndex') {
      const p = input.ExpressionAttributeValues && input.ExpressionAttributeValues[':ptype'];
      if (p === 'PROPERTY') {
        return { Items: [{ propertyId: 'p1', title: 'T', address: 'A', latitude: 1, longitude: 2 }] };
      }
      if (p === 'POST') {
        return { Items: [{ postId: 'post1', body: 'b', photos: [], propertyId: 'p1', scheduledAt: null }] };
      }
    }

    if (input && input.Key && String(input.Key.PK).startsWith('PROPERTY#')) {
      return { Item: { propertyId: 'p1', title: 'T', address: 'A', latitude: 1, longitude: 2 } };
    }

    if (input && input.RequestItems) {
      // Distinguish BatchGet vs BatchWrite by presence of Keys
      const table = Object.keys(input.RequestItems || {})[0];
      const v = input.RequestItems[table];
      if (v && v.Keys) {
        return { Responses: { [table]: [{ propertyId: 'p1', title: 'T', address: 'A', latitude: 1, longitude: 2 }] } };
      }
      // Treat array shapes as BatchWrite
      if (Array.isArray(v)) return {};
    }

    if (input && input.ProjectionExpression) return { Items: [] };

    return {};
  };
});

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

describe('repository delete helpers', () => {
  it('removeAllByEntity returns count and performs deletes', async () => {
    // override QueryCommand to return two items for delete
    mockBehavior = async (cmd: any) => {
      const input = cmd && cmd.input;
      if (input && input.IndexName === 'EntityTypeIndex') {
        return { Items: [{ PK: 'POST#p1', SK: 'METADATA#p1' }, { PK: 'POST#p2', SK: 'METADATA#p2' }] };
      }
      if (input && input.ProjectionExpression) {
        return { Items: [{ PK: 'X#1', SK: 'METADATA#1' }, { PK: 'X#2', SK: 'METADATA#2' }] };
      }
      if (input && input.RequestItems && Array.isArray(Object.values(input.RequestItems)[0])) return {};
      return {};
    };

    const n = await repo.removeAllByEntity('POST', { dryRun: false });
    expect(n).toBe(2);
  });

  it('removeAllFromTable returns count and performs deletes', async () => {
    mockBehavior = async (cmd: any) => {
      const input = cmd && cmd.input;
      if (input && input.ProjectionExpression) return { Items: [{ PK: 'X#1', SK: 'METADATA#1' }, { PK: 'X#2', SK: 'METADATA#2' }] };
      if (input && input.RequestItems && Array.isArray(Object.values(input.RequestItems)[0])) return {};
      return {};
    };

    const n = await repo.removeAllFromTable({ dryRun: false });
    expect(n).toBe(2);
  });

  it('createProperty accepts explicit id', async () => {
    const p = await repo.createProperty({ title: 'T', address: 'A', latitude: 1, longitude: 2 }, { id: 'explicit-id' });
    expect(p.id || (p as any).propertyId).toBe('explicit-id');
  });

  it('createPost honors reserved _id field', async () => {
    const res = await repo.createPost({ body: 'b', _id: 'post-explicit' } as any);
    expect(res.id).toBe('post-explicit');
  });
});

describe('repository branch behaviors', () => {
  it('getProperty returns null when item missing', async () => {
    mockBehavior = async (cmd: any) => {
      const input = cmd && cmd.input;
      if (input && input.Key && String(input.Key.PK).startsWith('PROPERTY#')) return {};
      return {};
    };
    const p = await repo.getProperty('nope');
    expect(p).toBeNull();
  });

  it('listPosts returns posts with property id placeholder when batch get returns empty', async () => {
    mockBehavior = async (cmd: any) => {
      const input = cmd && cmd.input;
      if (input && input.IndexName === 'EntityTypeIndex' && input.ExpressionAttributeValues && input.ExpressionAttributeValues[':ptype'] === 'POST') {
        return { Items: [{ postId: 'post-m', body: 'b', photos: [], propertyId: 'missing', scheduledAt: null }] };
      }
      if (input && input.RequestItems) {
        const table = Object.keys(input.RequestItems || {})[0];
        return { Responses: { [table]: [] } };
      }
      return {};
    };

    const posts = await repo.listPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].property).toBeTruthy();
    expect(posts[0].property && (posts[0].property as any).id).toBe('missing');
  });

  it('getPost returns null when post missing', async () => {
    mockBehavior = async (cmd: any) => {
      const input = cmd && cmd.input;
      if (input && input.Key && String(input.Key.PK).startsWith('POST#')) return {};
      return {};
    };
    const p = await repo.getPost('does-not-exist');
    expect(p).toBeNull();
  });
});

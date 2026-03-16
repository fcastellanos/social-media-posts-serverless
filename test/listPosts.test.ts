import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/repository', () => ({
  listPosts: async () => [
    { id: 'post1', body: 'hello', photos: [], property: { id: 'p1', address: '123 Main St' }, scheduled_at: null }
  ]
}));

import { handler as listPosts } from '../src/handlers/listPosts';

describe('listPosts handler', () => {
  it('returns 200 and posts list', async () => {
    const res: any = await listPosts({} as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('post1');
  });
});

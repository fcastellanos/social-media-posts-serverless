import { handler as createPost } from '../src/handlers/createPost';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/repository', () => ({
  createPost: async (data: any) => ({
    id: 'post-created',
    body: data.body,
    photos: (data.photos || []).map((p: any, i: number) => ({ id: `p${i+1}`, url: p.url })),
    property: data.propertyId ? { id: data.propertyId, address: '123 Main St' } : null,
    scheduled_at: data.scheduled_at || null,
  })
}));

describe('createPost handler', () => {
  it('returns 400 when body missing', async () => {
    const res: any = await createPost({} as any);
    expect(res.statusCode).toBe(400);
  });

  it('creates post successfully', async () => {
    const payload = { body: 'Hello world', photos: [{ url: 'https://example.com/1.jpg' }], property: { id: 'p1' }, scheduled_at: '2026-03-16T00:00:00Z' };
    const res: any = await createPost({ body: JSON.stringify(payload) } as any);
    expect(res.statusCode).toBe(201);
    const item = JSON.parse(res.body);
    expect(item.id).toBe('post-created');
    expect(item.body).toBe(payload.body);
    expect(Array.isArray(item.photos)).toBe(true);
    expect(item.property).toEqual({ id: 'p1', address: '123 Main St' });
    expect(item.scheduled_at).toBe(payload.scheduled_at);
  });
});

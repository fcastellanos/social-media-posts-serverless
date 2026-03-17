import { handler as getPost } from '../src/handlers/getPost';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/repository', () => ({
  getPost: async (id: string) => {
    if (id === 'exists') return { id: 'exists', body: 'hello', photos: [], property: { id: 'p1', address: '123' }, scheduled_at: null };
    return null;
  }
}));

describe('getPost handler', () => {
  it('returns 400 when id missing', async () => {
    const res: any = await getPost({} as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when not found', async () => {
    const res: any = await getPost({ pathParameters: { id: 'nope' } } as any);
    expect(res.statusCode).toBe(404);
  });

  it('returns 200 when found', async () => {
    const res: any = await getPost({ pathParameters: { id: 'exists' } } as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe('exists');
    expect(body.body).toBe('hello');
    expect(body.property).toEqual({ id: 'p1', address: '123' });
  });
});

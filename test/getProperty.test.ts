import { handler as getProperty } from '../src/handlers/getProperty';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/repository', () => ({
  getProperty: async (id: string) => {
    if (id === 'p1') return { id: 'p1', title: 'House', address: '123 Main St', latitude: 1, longitude: 2, metadata: {} };
    return null;
  }
}));

describe('getProperty handler', () => {
  it('returns 400 when id missing', async () => {
    const res: any = await getProperty({} as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when not found', async () => {
    const res: any = await getProperty({ pathParameters: { id: 'nope' } } as any);
    expect(res.statusCode).toBe(404);
  });

  it('returns 200 when found', async () => {
    const res: any = await getProperty({ pathParameters: { id: 'p1' } } as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe('p1');
    expect(body.title).toBe('House');
    expect(body.address).toBe('123 Main St');
  });
});

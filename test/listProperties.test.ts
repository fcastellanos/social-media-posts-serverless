import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/repository', () => ({
  listProperties: async () => [
    { id: 'p1', title: 'Test Property', address: '123 Main St', latitude: 12.34, longitude: 56.78, metadata: {} }
  ]
}));

import { handler as listProperties } from '../src/handlers/listProperties';

describe('listProperties handler', () => {
  it('returns 200 and property list', async () => {
    const res: any = await listProperties({} as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('p1');
  });
});

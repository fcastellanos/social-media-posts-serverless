import { handler as createPost } from '../src/handlers/createPost';
import { describe, it, expect } from 'vitest';

describe('createPost handler', () => {
  it('returns 400 when body missing', async () => {
    const res: any = await createPost({} as any);
    expect(res.statusCode).toBe(400);
  });
});

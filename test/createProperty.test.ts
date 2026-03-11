import { describe, it, expect, vi } from 'vitest';

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: async (_cmd: any) => ({}) })
  },
  PutCommand: function PutCommand() {}
}));

import { handler as createProperty } from '../src/handlers/createProperty';

describe('createProperty handler', () => {
  it('returns 400 when body missing', async () => {
    const res: any = await createProperty({} as any);
    expect(res.statusCode).toBe(400);
  });

  it('creates property when description is omitted', async () => {
    const body = {
      address: '123 Main St',
      city: 'Testville',
      latitude: 12.34,
      longitude: 56.78,
      name: 'Test Property',
      state: 'TS',
      zip: '12345'
    };

    const res: any = await createProperty({ body: JSON.stringify(body) } as any);
    expect(res.statusCode).toBe(201);
    const item = JSON.parse(res.body);
    expect(item.propertyId).toBeDefined();
    expect(item.description).toBeUndefined();
    expect(item.address).toBe(body.address);
  });
});

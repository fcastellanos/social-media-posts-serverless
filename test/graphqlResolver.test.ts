import { describe, it, expect, vi } from 'vitest';

const mockProperties = [
  { id: 'prop1', title: 'Property One', address: '123 Main St', latitude: 40.7, longitude: -74.0 },
];
const mockPosts = [
  { id: 'post1', body: 'Hello world', photos: [], property: { id: 'prop1', address: '123 Main St' }, scheduled_at: null },
];

vi.mock('../src/lib/repository', () => ({
  listProperties: async () => mockProperties,
  getProperty: async (id: string) => mockProperties.find(p => p.id === id) ?? null,
  listPosts: async () => mockPosts,
  getPost: async (id: string) => mockPosts.find(p => p.id === id) ?? null,
}));

import { handler } from '../src/handlers/graphqlResolver';

function event(fieldName: string, args: Record<string, any> = {}) {
  return { arguments: args, info: { fieldName, parentTypeName: 'Query' } };
}

describe('graphqlResolver handler', () => {
  describe('listProperties', () => {
    it('returns items array', async () => {
      const result = await handler(event('listProperties'));
      expect(result).toEqual({ items: mockProperties });
    });
  });

  describe('getProperty', () => {
    it('returns a property by id', async () => {
      const result = await handler(event('getProperty', { id: 'prop1' }));
      expect(result).toEqual(mockProperties[0]);
    });

    it('returns null for unknown id', async () => {
      const result = await handler(event('getProperty', { id: 'nope' }));
      expect(result).toBeNull();
    });
  });

  describe('listPosts', () => {
    it('returns items array', async () => {
      const result = await handler(event('listPosts'));
      expect(result).toEqual({ items: mockPosts });
    });
  });

  describe('getPost', () => {
    it('returns a post by id', async () => {
      const result = await handler(event('getPost', { id: 'post1' }));
      expect(result).toEqual(mockPosts[0]);
    });

    it('returns null for unknown id', async () => {
      const result = await handler(event('getPost', { id: 'nope' }));
      expect(result).toBeNull();
    });
  });

  describe('unknown field', () => {
    it('throws an error', async () => {
      await expect(handler(event('deleteEverything'))).rejects.toThrow('Unknown field: deleteEverything');
    });
  });
});

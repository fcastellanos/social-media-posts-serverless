import { describe, it, expect } from 'vitest'
import { toProperty, toPost, toPostApi, toPostsListApi } from '../src/lib/transformers'

describe('transformers', () => {
  it('maps property item correctly', () => {
    const raw = { propertyId: 'p1', title: 'My Place', address: '123 Main St', latitude: 1.23, longitude: 4.56 }
    const p = toProperty(raw)
    expect(p).toEqual({ id: 'p1', title: 'My Place', address: '123 Main St', latitude: 1.23, longitude: 4.56, metadata: {} })
  })

  it('maps post item correctly', () => {
    const raw = { postId: 'post1', title: 'Hello', body: 'body', photos: [{ id: 'ph1', url: 'https://example.com/x.jpg' }], propertyId: 'p1' }
    const p = toPost(raw)
    expect(p).toEqual({ id: 'post1', title: 'Hello', body: 'body', photos: [{ id: 'ph1', url: 'https://example.com/x.jpg' }], propertyId: 'p1', scheduled_at: null, createdAt: undefined })
  })

  it('postToApi includes property info', () => {
    const p = { id: 'post1', title: 'Hello', body: 'b', photos: [], scheduled_at: null }
    const prop = { id: 'p1', address: '123 Main', title: 'My Place' }
    const res = toPostApi(p, prop)
    expect(res.property).toEqual({ id: 'p1', address: '123 Main', title: 'My Place' })
  })

  it('postsListResponse pairs posts with propertyMap', () => {
    const posts = [{ id: 'post1', title: 'T', body: 'b', photos: [], propertyId: 'p1', scheduled_at: null }]
    const propMap: Record<string, any> = { p1: { id: 'p1', title: 'P', address: 'Addr' } }
    const out = toPostsListApi(posts as any, propMap)
    expect(out[0].property).toEqual({ id: 'p1', address: 'Addr', title: 'P' })
  })
})

describe('transformers edge cases', () => {
  it('mapPropertyItem returns null for falsy input', () => {
    expect(toProperty(null)).toBeNull()
    expect(toProperty(undefined)).toBeNull()
  })

  it('mapPropertyItem tolerates missing numeric fields', () => {
    const raw = { propertyId: 'p2', title: 'No coords' }
    const p = toProperty(raw)
    expect(p).toEqual({ id: 'p2', title: 'No coords', address: null, latitude: null, longitude: null, metadata: {} })
  })

  it('mapPostItem handles string photo entries', () => {
    const raw = { postId: 'post2', title: 'StrPhoto', body: 'b', photos: ['https://img.example/x.jpg'] }
    const p = toPost(raw)
    expect(p).toMatchObject({ id: 'post2', photos: [{ id: undefined, url: 'https://img.example/x.jpg' }] })
  })

  it('postToApi with null property returns property null', () => {
    const p = { id: 'post3', title: 'T', body: 'b', photos: [], scheduled_at: null }
    const out = toPostApi(p as any, null)
    expect(out.property).toBeNull()
  })

  it('postsListResponse falls back to property id when propertyMap missing entry', () => {
    const posts = [{ id: 'post4', title: 'T', body: 'b', photos: [], propertyId: 'pX', scheduled_at: null }]
    const propMap: Record<string, any> = {}
    const out = toPostsListApi(posts as any, propMap)
    expect(out[0].property).toEqual({ id: 'pX', title: null })
  })
})

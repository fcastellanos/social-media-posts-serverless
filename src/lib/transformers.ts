// Small collection of mapping/transform helper functions extracted from repository.ts
// These keep data-shape conversions separate from DB access for clarity and testability.

export function toProperty(it: any) {
  if (!it) return null
  return {
    id: it.propertyId,
    title: it.title || it.name || null,
    address: it.address || null,
    latitude: typeof it.latitude === 'number' ? it.latitude : null,
    longitude: typeof it.longitude === 'number' ? it.longitude : null,
    metadata: it.metadata || {},
  }
}

export function toPost(it: any) {
  if (!it) return null
  return {
    id: it.postId,
    title: it.title || it.name || null,
    body: it.body ?? it.content ?? null,
    photos: (it.photos || []).map((p: any) => (typeof p === 'string' ? { id: undefined, url: p } : { id: p && p.id, url: p && p.url })),
    propertyId: it.propertyId || null,
    scheduled_at: it.scheduledAt || null,
    createdAt: typeof it.createdAt === 'undefined' ? undefined : it.createdAt,
  }
}

export function toPostApi(p: any, property: any) {
  return {
    id: p.id,
    title: p.title || null,
    body: p.body,
    photos: p.photos || [],
    property: property ? { id: property.id, address: property.address, title: property.title } : null,
    scheduled_at: p.scheduled_at || null,
  }
}

export function toPostsListApi(posts: any[], propertyMap: Record<string, any>) {
  return posts.map(p => {
    const prop = p.propertyId ? propertyMap[p.propertyId] : null
    return toPostApi(p, prop || (p.propertyId ? { id: p.propertyId, title: null } : null))
  })
}

import { createProperty, createPost, removeAllByEntity, removeAllFromTable } from '../lib/repository';

type SeedProperty = { name: string; address: string; city?: string; state?: string; zip?: string; latitude?: number; longitude?: number; metadata?: any };
type SeedPost = { title: string; content: string; propertyName: string; photos?: Array<{ url: string; caption?: string }>; scheduled_at?: string };

const seeds: { properties: SeedProperty[]; examplePosts: SeedPost[] } = require('../../scripts/seeds.json');

function stableId(...parts: Array<string | undefined | null>) {
  return require('crypto').createHash('sha1').update(parts.join('|')).digest('hex');
}

type Payload = { action?: string; dryRun?: boolean; force?: boolean };

export const handler = async (event: any) => {
  const payload: Payload = (() => {
    if (!event) return {} as Payload;
    if (typeof event === 'string') return JSON.parse(event) as Payload;
    if (event.body) return typeof event.body === 'string' ? JSON.parse(event.body) as Payload : event.body as Payload;
    return event as Payload;
  })();

  const action = payload.action || 'create';
  const dryRun = payload.dryRun === true;
  const force = payload.force === true;

  try {
    if (action === 'create') {
      const propertyMap: Record<string, string> = {};
      for (const p of seeds.properties || []) {
        const id = stableId(p.name, p.address);
        const payload = { title: p.name, address: p.address, latitude: p.latitude || 0, longitude: p.longitude || 0, metadata: p.metadata || {} };
        if (dryRun) {
          console.log('DRY RUN - property', { id, ...payload });
          propertyMap[p.name] = id;
          continue;
        }
        const resp = await createProperty(payload, { id });
        propertyMap[p.name] = (resp as any).id || (resp as any).propertyId || id;
      }

      for (const post of seeds.examplePosts || []) {
        const propertyId = propertyMap[post.propertyName];
        const id = stableId(post.title, propertyId || '');
        const postPayload: any = { body: post.content, photos: post.photos || [], propertyId };
        if (dryRun) {
          console.log('DRY RUN - post', { id, ...postPayload });
          continue;
        }
        await createPost({ ...postPayload, _id: id });
      }

      return { statusCode: 200, body: JSON.stringify({ message: 'create complete' }) };
    }

    if (!dryRun && !force) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Destructive actions require { force: true } unless dryRun is enabled' }) };
    }

    if (action === 'clear:posts') {
      const n = await removeAllByEntity('POST', { dryRun });
      return { statusCode: 200, body: JSON.stringify({ deleted: n }) };
    }

    if (action === 'clear:properties') {
      const n = await removeAllByEntity('PROPERTY', { dryRun });
      return { statusCode: 200, body: JSON.stringify({ deleted: n }) };
    }

    if (action === 'clear:all' || action === 'clear:table') {
      const n = await removeAllFromTable({ dryRun });
      return { statusCode: 200, body: JSON.stringify({ deleted: n }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err: any) {
    console.error('adminSeeder error', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err && (err.message || err)) }) };
  }
};

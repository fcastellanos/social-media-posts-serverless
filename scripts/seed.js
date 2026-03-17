#!/usr/bin/env node
const crypto = require('crypto');
const { createProperty, createPost, removeAllPosts, removeAllProperties, removeAllFromTable } = require('./repository');
const DRY = !!process.env.DRY_RUN;

// Safe default: do nothing unless RUN_SEEDS=true. The `seed` npm script sets RUN_SEEDS=true
if (process.env.RUN_SEEDS !== 'true') {
  console.log('Skipping seeds (set RUN_SEEDS=true to enable). For manual runs use: RUN_SEEDS=true SEED_ACTION=create npm run seed');
  process.exit(0);
}

if (!process.env.PROPERTIES_TABLE_NAME && !DRY) {
  console.error('PROPERTIES_TABLE_NAME is required (or run with DRY_RUN=true)');
  process.exit(1);
}

const ACTION = process.env.SEED_ACTION || 'create';

function stableId(...parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
}

const { properties, examplePosts } = require('./seeds.json');

async function ensureProperty(item) {
  const title = item.title || item.name;
  const latitude = item.latitude;
  const longitude = item.longitude;
  const metadata = item.metadata || {};

  const id = stableId(title, item.address);

  const payload = { title, address: item.address, latitude, longitude, metadata };

  if (DRY) {
    console.log('DRY RUN - property:', { ...payload, propertyId: id });
    return { propertyId: id };
  }

  // createProperty in scripts/repository.js accepts an optional id to support deterministic seeds
  const resp = await createProperty(payload, { id });
  console.log('Created/ensured property', item.name);
  return { propertyId: resp.propertyId || id };
}

async function ensurePost(post, propertyMap) {
  const id = stableId(post.title, post.propertyName || '');
  const payload = {
    body: post.content,
    photos: post.photos ? post.photos.map(p => ({ id: stableId(post.title, p.url), url: p.url })) : undefined,
    propertyId: post.propertyName && propertyMap[post.propertyName] ? propertyMap[post.propertyName] : undefined,
    scheduled_at: post.scheduled_at,
  };

  if (DRY) {
    console.log('DRY RUN - post:', { ...payload, postId: id });
    return;
  }

  // createPost in scripts/repository.js accepts optional id for deterministic posts
  await createPost(payload, { id });
  console.log('Created post', post.title);
}

async function run() {
  const propertyMap = {};
  for (const p of properties) {
    const { propertyId } = await ensureProperty(p);
    propertyMap[p.name] = propertyId;
  }

  for (const post of examplePosts) {
    await ensurePost(post, propertyMap);
  }

  console.log('Done');
}

async function handleAction() {
  if (ACTION === 'create') return run();
  if (ACTION === 'clear:posts') {
    const n = await removeAllPosts({ dryRun: DRY });
    console.log('removeAllPosts ->', n);
    return;
  }
  if (ACTION === 'clear:properties') {
    const n = await removeAllProperties({ dryRun: DRY });
    console.log('removeAllProperties ->', n);
    return;
  }
  if (ACTION === 'clear:all' || ACTION === 'clear:table') {
    const n = await removeAllFromTable({ dryRun: DRY });
    console.log('removeAllFromTable ->', n);
    return;
  }
  console.log('Unknown SEED_ACTION:', ACTION);
}

handleAction().catch((err) => { console.error(err); process.exit(1); });

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as repo from '../src/lib/repository';
import { handler } from '../src/handlers/adminSeeder';

vi.mock('../src/lib/repository');

const mocked = repo as unknown as any;

beforeEach(() => {
  vi.resetAllMocks();
  // silence console output during tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocked.createProperty = vi.fn(async (p: any, opts: any) => ({ id: opts && opts.id ? opts.id : 'gen-id' }));
  mocked.createPost = vi.fn(async (p: any) => ({ id: (p && (p as any)._id) || 'post-gen' }));
  mocked.removeAllByEntity = vi.fn(async (etype: string, opts?: any) => 0);
  mocked.removeAllFromTable = vi.fn(async (opts?: any) => 0);
});

describe('adminSeeder handler', () => {
  it('create (dryRun) does not call repository create functions', async () => {
    const res = await handler({ action: 'create', dryRun: true });
    expect(res.statusCode).toBe(200);
    expect(mocked.createProperty).not.toHaveBeenCalled();
    expect(mocked.createPost).not.toHaveBeenCalled();
  });

  it('create (real) calls repository createProperty and createPost', async () => {
    const res = await handler({ action: 'create' });
    expect(res.statusCode).toBe(200);
    // seeds.json includes at least one property and one post; ensure functions were called
    expect(mocked.createProperty).toHaveBeenCalled();
    expect(mocked.createPost).toHaveBeenCalled();
  });

  it('clear:posts requires force unless dryRun', async () => {
    const resNoForce = await handler({ action: 'clear:posts', dryRun: false });
    expect(resNoForce.statusCode).toBe(400);

    const resDry = await handler({ action: 'clear:posts', dryRun: true });
    expect(resDry.statusCode).toBe(200);
    expect(mocked.removeAllByEntity).toHaveBeenCalledWith('POST', { dryRun: true });

    const resForce = await handler({ action: 'clear:posts', dryRun: false, force: true });
    expect(resForce.statusCode).toBe(200);
    expect(mocked.removeAllByEntity).toHaveBeenCalledWith('POST', { dryRun: false });
  });

  it('passes deterministic ids to repository.createProperty and createPost', async () => {
    // run real create
    const res = await handler({ action: 'create' });
    expect(res.statusCode).toBe(200);
    expect(mocked.createProperty).toHaveBeenCalled();
    // compute expected id for first seed property
    const seeds = require('../scripts/seeds.json');
    const crypto = require('crypto');
    const first = seeds.properties[0];
    const expectedId = crypto.createHash('sha1').update([first.name, first.address].join('|')).digest('hex');
    const firstCallOpts = mocked.createProperty.mock.calls[0][1];
    expect(firstCallOpts).toBeDefined();
    expect(firstCallOpts.id).toBe(expectedId);
  });

  it('clear:all with force calls removeAllFromTable', async () => {
    const res = await handler({ action: 'clear:all', force: true });
    expect(res.statusCode).toBe(200);
    expect(mocked.removeAllFromTable).toHaveBeenCalledWith({ dryRun: false });
  });

  it('returns 500 when repository.createProperty throws', async () => {
    mocked.createProperty = vi.fn(async () => { throw new Error('boom'); });
    const res = await handler({ action: 'create' });
    expect(res.statusCode).toBe(500);
    expect(mocked.createProperty).toHaveBeenCalled();
  });

  it('accepts string event payloads', async () => {
    const res = await handler(JSON.stringify({ action: 'clear:posts', dryRun: true }));
    expect(res.statusCode).toBe(200);
    expect(mocked.removeAllByEntity).toHaveBeenCalledWith('POST', { dryRun: true });
  });

  it('accepts event with body string (API Gateway style)', async () => {
    const res = await handler({ body: JSON.stringify({ action: 'clear:properties', dryRun: true }) });
    expect(res.statusCode).toBe(200);
    expect(mocked.removeAllByEntity).toHaveBeenCalledWith('PROPERTY', { dryRun: true });
  });

  it('unknown action returns 400', async () => {
    const res = await handler({ action: 'nope', dryRun: true });
    expect(res.statusCode).toBe(400);
  });

  it('handles undefined event (defaults to create)', async () => {
    const res = await handler(undefined as any);
    expect(res.statusCode).toBe(200);
    expect(mocked.createProperty).toHaveBeenCalled();
  });
});


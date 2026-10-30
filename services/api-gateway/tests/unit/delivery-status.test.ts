import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { delivery_status_routes } from '../../src/delivery-status.js';

test('CI cache expires and an unavailable GitHub does not keep reporting success', async () => {
  let time = 1000;
  let calls = 0;
  const app = express();
  app.use('/api/admin', delivery_status_routes(async () => {
    calls++;
    if (calls > 1) throw new Error('unavailable');
    return Response.json({ workflow_runs: [{ status: 'completed', conclusion: 'success', html_url: 'https://github.com/Dihoccode1/Vinlook/actions/runs/123' }] });
  }, () => time));
  const first = await request(app).get('/api/admin/monitor/delivery').expect(200);
  assert.equal(first.body.data.ci.conclusion, 'success');
  assert.equal(first.body.data.cd.state, 'not_configured');
  await request(app).get('/api/admin/monitor/delivery');
  assert.equal(calls, 1);
  time += 60001;
  const failed = await request(app).get('/api/admin/monitor/delivery').expect(200);
  assert.equal(failed.body.data.ci.state, 'unknown');
  assert.equal(failed.body.data.ci.conclusion, undefined);
});

test('CI distinguishes a repository with no workflow runs', async () => {
  const app = express();
  app.use(delivery_status_routes(async () => Response.json({ workflow_runs: [] })));
  const result = await request(app).get('/monitor/delivery').expect(200);
  assert.equal(result.body.data.ci.state, 'no_runs');
});

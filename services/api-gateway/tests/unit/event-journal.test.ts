import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { create_event_journal } from '../../src/event-journal.js';

test('journal records completed usage and errors without retaining private request data', async () => {
  const app = express();
  const journal = create_event_journal();
  app.use(journal.middleware);
  app.use('/api/admin', journal.router);
  app.get('/api/pois', (_req, res) => res.json({ data: [] }));
  app.post('/api/routes', (_req, res) => res.sendStatus(502));
  await request(app).get('/api/pois?search=private-search');
  await request(app).post('/api/routes').send({ secret: 'private-body' });
  const result = await request(app).get('/api/admin/monitor/events').expect(200);
  assert.equal(result.body.data.usage.length, 2);
  assert.equal(result.body.data.usage[0].message, 'Tìm đường');
  assert.equal(result.body.data.system[0].status, 502);
  assert.equal(result.body.data.system[0].level, 'error');
  assert.ok(!JSON.stringify(result.body).includes('private-'));
  const again = await request(app).get('/api/admin/monitor/events');
  assert.deepEqual(again.body, result.body);
});

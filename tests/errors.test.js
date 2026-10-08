process.env.NODE_ENV = 'test';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const sequelize = require('../src/config/db');
const app = require('../src/app');
const { errorHandler } = require('../src/middleware/errorHandler');

before(async () => {
  await sequelize.sync({ force: true });
});

test('unknown route returns a JSON 404, not an HTML page', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.match(res.headers['content-type'], /json/);
  assert.deepEqual(res.body, { message: 'Route not found' });
});

test('broken JSON returns a JSON 400 with no stack trace', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email": "a@b.com", ');
  assert.equal(res.status, 400);
  assert.match(res.headers['content-type'], /json/);
  assert.deepEqual(res.body, { message: 'Request body is not valid JSON' });
  assert.equal(res.text.includes('node_modules'), false);
});

test('oversized body returns 413', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(20000) }));
  assert.equal(res.status, 413);
});

test('unexpected errors give a safe 500 message without internal details', () => {
  const calls = {};
  const res = {
    headersSent: false,
    status(code) { calls.status = code; return this; },
    json(body) { calls.body = body; return this; },
  };
  const original = console.error;
  console.error = () => {};
  errorHandler(new Error('password for db is hunter2'), {}, res, () => {});
  console.error = original;
  assert.equal(calls.status, 500);
  assert.deepEqual(calls.body, { message: 'Something went wrong' });
});

test('health check still works', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

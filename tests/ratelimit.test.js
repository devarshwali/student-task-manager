process.env.NODE_ENV = 'test';
process.env.TEST_RATE_LIMIT = '1';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const sequelize = require('../src/config/db');
const app = require('../src/app');

before(async () => {
  await sequelize.sync({ force: true });
});

test('login is rate limited after 10 attempts', async () => {
  const statuses = [];
  for (let i = 0; i < 12; i += 1) {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'WrongPass9' });
    statuses.push(res.status);
  }
  assert.equal(statuses.slice(0, 10).every((s) => s === 401), true);
  assert.equal(statuses[10], 429);
  assert.equal(statuses[11], 429);
});

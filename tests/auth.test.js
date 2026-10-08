process.env.NODE_ENV = 'test';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';

const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const sequelize = require('../src/config/db');
const User = require('../src/models/User');
const app = require('../src/app');

const good = { name: 'Asha', email: 'asha@example.com', password: 'MyPass123' };

before(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await User.destroy({ where: {} });
});

test('register: creates a user and never returns the password or hash', async () => {
  const res = await request(app).post('/api/auth/register').send(good);
  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, good.email);
  assert.equal(res.body.user.password, undefined);
  assert.equal(res.body.user.passwordHash, undefined);
});

test('register: password is stored as a bcrypt hash, not plain text', async () => {
  await request(app).post('/api/auth/register').send(good);
  const saved = await User.findOne({ where: { email: good.email } });
  assert.notEqual(saved.passwordHash, good.password);
  assert.match(saved.passwordHash, /^\$2[aby]\$/);
});

test('register: extra fields such as role are ignored', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...good, role: 'admin' });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, undefined);
  const saved = await User.findOne({ where: { email: good.email } });
  assert.equal(saved.role, undefined);
});

test('register: rejects empty body, bad email, weak and overlong passwords', async () => {
  const cases = [
    {},
    { ...good, email: 'not-an-email' },
    { ...good, password: 'short1' },
    { ...good, password: 'onlyletters' },
    { ...good, password: '12345678' },
    { ...good, password: 'a1'.repeat(40) },
    { ...good, name: 'A' },
    { ...good, email: ['a@b.com'] },
  ];
  for (const body of cases) {
    const res = await request(app).post('/api/auth/register').send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok(Array.isArray(res.body.errors));
  }
  assert.equal(await User.count(), 0);
});

test('register: duplicate email returns 409 (email is case-insensitive)', async () => {
  await request(app).post('/api/auth/register').send(good);
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...good, email: 'ASHA@Example.com' });
  assert.equal(res.status, 409);
});

test('login: success returns a token that expires and carries only the user id', async () => {
  await request(app).post('/api/auth/register').send(good);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: good.email, password: good.password });
  assert.equal(res.status, 200);
  const payload = jwt.decode(res.body.token);
  assert.ok(payload.sub);
  assert.ok(payload.exp, 'token must have an expiry');
  assert.equal(payload.role, undefined);
  assert.equal(res.body.user.passwordHash, undefined);
});

test('login: unknown email and wrong password look identical', async () => {
  await request(app).post('/api/auth/register').send(good);
  const unknown = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nobody@example.com', password: 'whatever1' });
  const wrong = await request(app)
    .post('/api/auth/login')
    .send({ email: good.email, password: 'WrongPass9' });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.deepEqual(unknown.body, wrong.body);
});

test('login: empty body is a 400, not a 500', async () => {
  const res = await request(app).post('/api/auth/login').send({});
  assert.equal(res.status, 400);
});

test('login: password sent as an object does not crash the server', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: good.email, password: { $ne: '' } });
  assert.equal(res.status, 400);
});

test('/me: requires a valid token', async () => {
  const none = await request(app).get('/api/auth/me');
  assert.equal(none.status, 401);

  await request(app).post('/api/auth/register').send(good);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: good.email, password: good.password });
  const ok = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, good.email);
});

test('/me: rejects expired, forged and alg=none tokens', async () => {
  await request(app).post('/api/auth/register').send(good);
  const user = await User.findOne({ where: { email: good.email } });

  const expired = jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, { expiresIn: -10 });
  const forged = jwt.sign({ sub: String(user.id) }, 'secret123');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const algNone = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: String(user.id) })}.`;

  for (const token of [expired, forged, algNone, 'garbage']) {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401, token.slice(0, 20));
  }
});

test('/me: a valid token for a deleted user is rejected', async () => {
  await request(app).post('/api/auth/register').send(good);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: good.email, password: good.password });
  await User.destroy({ where: {} });
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(res.status, 401);
});

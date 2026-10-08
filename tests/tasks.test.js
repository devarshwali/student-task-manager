process.env.NODE_ENV = 'test';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';

const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const sequelize = require('../src/config/db');
const Task = require('../src/models/Task');
const User = require('../src/models/User');
const app = require('../src/app');
const { createUserAndToken } = require('./helpers');

function daysFromToday(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

let student;

before(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await Task.destroy({ where: {} });
  await User.destroy({ where: {} });
  student = await createUserAndToken(app);
});

const create = (body) =>
  request(app).post('/api/tasks').set('Authorization', student.authHeader).send(body);

test('create: requires login (no token and bad token give 401)', async () => {
  const none = await request(app).post('/api/tasks').send({ title: 'No token' });
  assert.equal(none.status, 401);
  const bad = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer not-a-real-token')
    .send({ title: 'Bad token' });
  assert.equal(bad.status, 401);
  assert.equal(await Task.count(), 0);
});

test('create: valid task with all fields returns 201 and belongs to the logged-in student', async () => {
  const body = {
    title: 'Finish maths homework',
    description: 'Chapter 4 exercises',
    dueDate: daysFromToday(7),
    priority: 'high',
  };
  const res = await create(body);
  assert.equal(res.status, 201);
  assert.equal(res.body.message, 'Task created');
  assert.equal(res.body.data.title, body.title);
  assert.equal(res.body.data.priority, 'high');
  assert.equal(res.body.data.status, 'pending');
  assert.equal(res.body.data.userId, student.id);
  assert.equal(await Task.count(), 1);
});

test('create: title only uses defaults (priority medium, status pending)', async () => {
  const res = await create({ title: 'Read chapter 5' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.priority, 'medium');
  assert.equal(res.body.data.status, 'pending');
});

test('create: title is trimmed', async () => {
  const res = await create({ title: '  Buy notebook  ' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.title, 'Buy notebook');
});

test('create: extra fields (id, status, userId) are ignored', async () => {
  const res = await create({ title: 'Hack attempt', id: 999, status: 'completed', userId: 42 });
  assert.equal(res.status, 201);
  assert.notEqual(res.body.data.id, 999);
  assert.equal(res.body.data.status, 'pending');
  assert.equal(res.body.data.userId, student.id, 'owner must come from the token, not the body');
});

test('create: invalid input returns 400 and saves nothing', async () => {
  const cases = [
    {},
    { description: 'no title' },
    { title: '   ' },
    { title: 'a'.repeat(101) },
    { title: 12345 },
    { title: ['x'] },
    { title: 'T', priority: 'urgent' },
    { title: 'T', dueDate: '2020-01-01' },
    { title: 'T', dueDate: '2027-02-31' },
    { title: 'T', dueDate: '15/10/2027' },
    { title: 'T', dueDate: 20271015 },
    { title: 'T', description: 'd'.repeat(501) },
    { title: 'T', description: 123 },
  ];
  for (const body of cases) {
    const res = await create(body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    assert.ok(res.body.errors.length > 0);
  }
  assert.equal(await Task.count(), 0);
});

test('create: today is allowed as a due date', async () => {
  const res = await create({ title: 'Due today', dueDate: daysFromToday(0) });
  assert.equal(res.status, 201);
});

test('create: boundary lengths are accepted (title 100, description 500)', async () => {
  const res = await create({ title: 'a'.repeat(100), description: 'd'.repeat(500) });
  assert.equal(res.status, 201);
});

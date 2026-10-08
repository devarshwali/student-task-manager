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

let me;
let other;

const get = (query = '') =>
  request(app).get(`/api/tasks${query}`).set('Authorization', me.authHeader);
const titles = (res) => res.body.data.map((t) => t.title);

before(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await Task.destroy({ where: {} });
  await User.destroy({ where: {} });
  me = await createUserAndToken(app);
  other = await createUserAndToken(app);

  const mine = (fields) => Task.create({ userId: me.id, ...fields });
  await mine({ title: 'Maths homework', description: 'Algebra chapter 4', priority: 'high', status: 'pending', dueDate: '2027-03-10' });
  await mine({ title: 'Read history book', description: 'Chapter on MATHS in ancient Greece', priority: 'low', status: 'completed', dueDate: '2027-03-01' });
  await mine({ title: 'Science project', description: null, priority: 'medium', status: 'pending', dueDate: '2027-04-01' });
  await mine({ title: '100% done list', description: 'checklist', priority: 'low', status: 'pending', dueDate: null });
  await mine({ title: 'snake_case notes', description: 'naming', priority: 'medium', status: 'completed', dueDate: '2027-03-20' });
  await Task.create({ userId: other.id, title: 'Other student maths task', priority: 'high' });
});

// ---------- normal use ----------

test('requires login', async () => {
  const res = await request(app).get('/api/tasks');
  assert.equal(res.status, 401);
});

test('no filters: returns only my tasks, with pagination info', async () => {
  const res = await get();
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 5);
  assert.deepEqual(res.body.pagination, { page: 1, limit: 10, total: 5, totalPages: 1 });
  assert.ok(res.body.data.every((t) => t.userId === me.id));
  assert.equal(titles(res).includes('Other student maths task'), false);
});

test('search: matches title or description, case-insensitive', async () => {
  const res = await get('?q=MATHS');
  assert.equal(res.status, 200);
  assert.deepEqual(titles(res).sort(), ['Maths homework', 'Read history book']);
});

test('search: no match returns an empty list, not an error', async () => {
  const res = await get('?q=zzzz');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, []);
  assert.equal(res.body.pagination.total, 0);
  assert.equal(res.body.pagination.totalPages, 0);
});

test('filter: by status and by priority', async () => {
  const pending = await get('?status=pending');
  assert.equal(pending.body.pagination.total, 3);
  const high = await get('?priority=high');
  assert.deepEqual(titles(high), ['Maths homework']);
});

test('filter: due date range is inclusive and skips tasks without a due date', async () => {
  const res = await get('?dueAfter=2027-03-01&dueBefore=2027-03-10&sort=dueDate&order=asc');
  assert.deepEqual(titles(res), ['Read history book', 'Maths homework']);
});

test('combined: search + status + priority', async () => {
  const res = await get('?q=maths&status=pending&priority=high');
  assert.deepEqual(titles(res), ['Maths homework']);
});

test('sort: by priority uses high > medium > low', async () => {
  const res = await get('?sort=priority&order=desc');
  const order = res.body.data.map((t) => t.priority);
  assert.deepEqual(order, ['high', 'medium', 'medium', 'low', 'low']);
});

test('sort: by title ascending', async () => {
  const res = await get('?sort=title&order=asc');
  // SQLite sorts text by character code: digits, then capitals, then lowercase.
  assert.deepEqual(titles(res), [
    '100% done list',
    'Maths homework',
    'Read history book',
    'Science project',
    'snake_case notes',
  ]);
});

test('pagination: pages are split correctly and beyond the last page is empty', async () => {
  for (let i = 0; i < 20; i += 1) {
    await Task.create({ userId: me.id, title: `Bulk task ${i}` });
  }
  const page3 = await get('?limit=10&page=3');
  assert.equal(page3.body.data.length, 5);
  assert.deepEqual(page3.body.pagination, { page: 3, limit: 10, total: 25, totalPages: 3 });
  const beyond = await get('?limit=10&page=9');
  assert.equal(beyond.status, 200);
  assert.deepEqual(beyond.body.data, []);
});

// ---------- invalid input ----------

test('invalid values are rejected with 400', async () => {
  const bad = [
    '?status=done',
    '?priority=urgent',
    '?dueAfter=tomorrow',
    '?dueBefore=2027-02-31',
    '?dueAfter=2027-05-01&dueBefore=2027-04-01',
    '?sort=password',
    '?order=sideways',
    '?page=0',
    '?page=-1',
    '?page=abc',
    '?page=1.5',
    '?limit=0',
    '?limit=1000',
    `?q=${'a'.repeat(101)}`,
    '?status=pending&status=completed',
    '?q[$ne]=x',
  ];
  for (const query of bad) {
    const res = await get(query);
    assert.equal(res.status, 400, query);
    assert.ok(res.body.errors.length > 0, query);
  }
});

// ---------- edge cases and security ----------

test('wildcard characters are treated as plain text', async () => {
  const percent = await get('?q=%25');
  assert.deepEqual(titles(percent), ['100% done list']);
  const underscore = await get('?q=_');
  assert.deepEqual(titles(underscore), ['snake_case notes']);
});

test('SQL injection text is treated as plain text and returns nothing', async () => {
  const attempts = ["' OR 1=1 --", "'; DROP TABLE Tasks; --", '" OR ""="'];
  for (const text of attempts) {
    const res = await get(`?q=${encodeURIComponent(text)}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
  }
  assert.equal(await Task.count(), 6, 'no tasks were lost');
});

test('blank search text is ignored', async () => {
  const res = await get('?q=%20%20');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 5);
});

test('a student can not see another student\'s tasks even by searching for them', async () => {
  const res = await get('?q=Other student');
  assert.deepEqual(res.body.data, []);
});

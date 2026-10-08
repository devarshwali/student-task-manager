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
let myTask;
let otherTask;

const as = (user) => (req) => req.set('Authorization', user.authHeader);

before(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await Task.destroy({ where: {} });
  await User.destroy({ where: {} });
  me = await createUserAndToken(app);
  other = await createUserAndToken(app);
  myTask = await Task.create({ userId: me.id, title: 'Maths homework', priority: 'low' });
  otherTask = await Task.create({ userId: other.id, title: 'Not mine' });
});

test('update: changes allowed fields and returns the task', async () => {
  const res = await as(me)(request(app).patch(`/api/tasks/${myTask.id}`))
    .send({ title: '  Maths homework (updated) ', priority: 'high', description: 'Chapter 5' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.title, 'Maths homework (updated)');
  assert.equal(res.body.data.priority, 'high');
  assert.equal(res.body.data.description, 'Chapter 5');
});

test('update: null clears description and due date', async () => {
  await myTask.update({ description: 'x', dueDate: '2027-05-01' });
  const res = await as(me)(request(app).patch(`/api/tasks/${myTask.id}`))
    .send({ description: null, dueDate: null });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.description, null);
  assert.equal(res.body.data.dueDate, null);
});

test('update: status, id and userId can not be changed through this endpoint', async () => {
  const res = await as(me)(request(app).patch(`/api/tasks/${myTask.id}`))
    .send({ title: 'Still mine', status: 'completed', id: 999, userId: other.id });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'pending');
  assert.equal(res.body.data.id, myTask.id);
  assert.equal(res.body.data.userId, me.id);
});

test('update: invalid input returns 400 and changes nothing', async () => {
  const cases = [{}, { title: '' }, { title: 'a'.repeat(101) }, { priority: 'urgent' }, { dueDate: '2020-01-01' }, { dueDate: 'soon' }];
  for (const body of cases) {
    const res = await as(me)(request(app).patch(`/api/tasks/${myTask.id}`)).send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  const fresh = await Task.findByPk(myTask.id);
  assert.equal(fresh.title, 'Maths homework');
});

test('update/complete/delete: another student\'s task is a 404', async () => {
  const upd = await as(me)(request(app).patch(`/api/tasks/${otherTask.id}`)).send({ title: 'Taken over' });
  const cmp = await as(me)(request(app).patch(`/api/tasks/${otherTask.id}/complete`));
  const del = await as(me)(request(app).delete(`/api/tasks/${otherTask.id}`));
  assert.deepEqual([upd.status, cmp.status, del.status], [404, 404, 404]);
  const untouched = await Task.findByPk(otherTask.id);
  assert.equal(untouched.title, 'Not mine');
  assert.equal(untouched.status, 'pending');
});

test('bad ids: letters, decimals and negatives are a 400; unknown id is a 404', async () => {
  for (const id of ['abc', '1.5', '-1', '1;DROP']) {
    const res = await as(me)(request(app).patch(`/api/tasks/${id}`)).send({ title: 'x' });
    assert.equal(res.status, 400, id);
  }
  const res = await as(me)(request(app).delete('/api/tasks/99999'));
  assert.equal(res.status, 404);
});

test('complete: marks the task completed and is safe to repeat', async () => {
  const first = await as(me)(request(app).patch(`/api/tasks/${myTask.id}/complete`));
  const second = await as(me)(request(app).patch(`/api/tasks/${myTask.id}/complete`));
  assert.equal(first.status, 200);
  assert.equal(first.body.data.status, 'completed');
  assert.equal(second.status, 200);
});

test('delete: removes the task, second delete is a 404', async () => {
  const first = await as(me)(request(app).delete(`/api/tasks/${myTask.id}`));
  assert.equal(first.status, 200);
  assert.equal(await Task.findByPk(myTask.id), null);
  const second = await as(me)(request(app).delete(`/api/tasks/${myTask.id}`));
  assert.equal(second.status, 404);
});

test('all three endpoints require login', async () => {
  const a = await request(app).patch(`/api/tasks/${myTask.id}`).send({ title: 'x' });
  const b = await request(app).patch(`/api/tasks/${myTask.id}/complete`);
  const c = await request(app).delete(`/api/tasks/${myTask.id}`);
  assert.deepEqual([a.status, b.status, c.status], [401, 401, 401]);
});

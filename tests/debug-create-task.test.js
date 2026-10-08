process.env.NODE_ENV = 'test';
process.env.DB_STORAGE = ':memory:';

const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const sequelize = require('../src/config/db');
const Task = require('../src/models/Task');
const mountBuggy = require('../docs/examples/buggy-create-task');
const mountFixed = require('../docs/examples/fixed-create-task');

function makeApp(mount) {
  const app = express();
  app.use(express.json());
  mount(app, Task);
  return app;
}

const buggy = makeApp(mountBuggy);
const fixed = makeApp(mountFixed);

before(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await Task.destroy({ where: {} });
});

// These two tests document the original bug, so it can never come back unnoticed.
test('ORIGINAL BUG: valid request returns 500 with an empty body but the task is saved', async () => {
  const res = await request(buggy).post('/tasks').send({ title: 'Finish maths homework' });
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, {});
  assert.equal(await Task.count(), 1);
});

test('ORIGINAL BUG: client can set id and status because req.body is passed to the model', async () => {
  await request(buggy).post('/tasks').send({ title: 'Sneaky', id: 500, status: 'completed' });
  const saved = await Task.findOne();
  assert.equal(saved.id, 500);
  assert.equal(saved.status, 'completed');
});

test('FIXED: valid request returns 201 with the created task', async () => {
  const res = await request(fixed).post('/tasks').send({ title: 'Finish maths homework' });
  assert.equal(res.status, 201);
  assert.equal(res.body.message, 'Task created');
  assert.equal(res.body.data.title, 'Finish maths homework');
  assert.equal(await Task.count(), 1);
});

test('FIXED: id and status sent by the client are ignored', async () => {
  const res = await request(fixed)
    .post('/tasks')
    .send({ title: 'Sneaky', id: 500, status: 'completed' });
  assert.equal(res.status, 201);
  assert.notEqual(res.body.data.id, 500);
  assert.equal(res.body.data.status, 'pending');
});

test('FIXED: missing title is a clean 400 and nothing is saved', async () => {
  const res = await request(fixed).post('/tasks').send({ description: 'no title' });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Validation failed');
  assert.equal(await Task.count(), 0);
});

test('FIXED: a database failure returns a safe message with no internal details', async () => {
  const original = Task.create;
  Task.create = async () => {
    throw new Error('SQLITE_ERROR: no such table: Tasks');
  };
  try {
    const res = await request(fixed).post('/tasks').send({ title: 'Anything' });
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { message: 'Something went wrong' });
  } finally {
    Task.create = original;
  }
});

// Run with:  node docs/examples/reproduce-bug.js
// Mounts the buggy handler on a small app with an in-memory database and sends requests.
process.env.NODE_ENV = 'test';
process.env.DB_STORAGE = ':memory:';

const express = require('express');
const request = require('supertest');
const sequelize = require('../../src/config/db');
const Task = require('../../src/models/Task');
const mountBuggy = require('./buggy-create-task');

const app = express();
app.use(express.json());
mountBuggy(app, Task);

async function send(label, body) {
  const res = await request(app).post('/tasks').send(body);
  const rows = await Task.count();
  console.log(`\n# ${label}`);
  console.log(`Request body : ${JSON.stringify(body)}`);
  console.log(`HTTP status  : ${res.status}`);
  console.log(`Response body: ${JSON.stringify(res.body)}`);
  console.log(`Rows in DB   : ${rows}`);
}

(async () => {
  await sequelize.sync({ force: true });
  await send('1. A perfectly valid request', { title: 'Finish maths homework' });
  await send('2. The client retries because it saw an error', { title: 'Finish maths homework' });
  await send('3. Client tries to set id and status itself', { title: 'Sneaky', id: 500, status: 'completed' });
  await send('4. Missing title', { description: 'no title' });
  const all = await Task.findAll({ raw: true });
  console.log('\n# Final table contents:');
  console.log(JSON.stringify(all.map((t) => ({ id: t.id, title: t.title, status: t.status }))));
  process.exit(0);
})();

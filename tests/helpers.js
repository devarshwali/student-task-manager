const request = require('supertest');

// Registers a student and logs in. Returns { id, token, authHeader }.
async function createUserAndToken(app, overrides = {}) {
  const creds = {
    name: 'Test Student',
    email: `student${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'TestPass123',
    ...overrides,
  };
  const reg = await request(app).post('/api/auth/register').send(creds);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: creds.email, password: creds.password });
  return {
    id: reg.body.user.id,
    email: creds.email,
    token: login.body.token,
    authHeader: `Bearer ${login.body.token}`,
  };
}

module.exports = { createUserAndToken };

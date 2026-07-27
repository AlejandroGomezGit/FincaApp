process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const prisma = require('../config/prisma');

const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

describe('POST /api/auth/register', () => {
  it('registra un usuario nuevo y devuelve tokens', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('USER');
  });

  it('rechaza contraseñas cortas (validación)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: uniqueEmail(), password: '123' });

    expect(res.status).toBe(400);
  });

  it('rechaza email duplicado con 409', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'password123' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('devuelve 401 con un email que no existe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@example.com', password: 'whatever1' });

    expect(res.status).toBe(401);
  });

  it('devuelve 401 con contraseña incorrecta', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('permite login con credenciales correctas', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});

describe('POST /api/auth/refresh', () => {
  it('rota el refresh token y el anterior deja de servir (detección de reuso)', async () => {
    const email = uniqueEmail();
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email, password: 'password123' });
    const oldRefresh = reg.body.refreshToken;

    const first = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh });
    expect(first.status).toBe(200);
    expect(first.body.accessToken).toBeDefined();
    expect(first.body.refreshToken).not.toBe(oldRefresh);

    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });

  it('rechaza un refresh token que no existe', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'no-existe' });
    expect(res.status).toBe(401);
  });
});

describe('RBAC', () => {
  it('bloquea /admin/users a un usuario con rol USER', async () => {
    const email = uniqueEmail();
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email, password: 'password123' });

    const res = await request(app)
      .get('/api/auth/admin/users')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('rechaza /me sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

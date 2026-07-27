process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const prisma = require('../config/prisma');

function tokenFor(userId) {
  return jwt.sign({ userId, role: 'USER' }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

let userA, userB, farmA;

beforeAll(async () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  userA = await prisma.user.create({ data: { name: 'Test User A', email: `a_${suffix}@test.com`, password: 'x' } });
  userB = await prisma.user.create({ data: { name: 'Test User B', email: `b_${suffix}@test.com`, password: 'x' } });
  farmA = await prisma.farm.create({ data: { name: 'Finca de A', userId: userA.id } });
});

afterAll(async () => {
  await prisma.farm.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  await prisma.$disconnect();
});

describe('Frontera de ownership entre usuarios (farms)', () => {
  it('el dueño puede ver su propia finca', async () => {
    const res = await request(app)
      .get(`/api/farms/${farmA.id}`)
      .set('Authorization', `Bearer ${tokenFor(userA.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(farmA.id);
  });

  it('otro usuario NO puede ver la finca (404, no 403 — no revela que existe)', async () => {
    const res = await request(app)
      .get(`/api/farms/${farmA.id}`)
      .set('Authorization', `Bearer ${tokenFor(userB.id)}`);
    expect(res.status).toBe(404);
  });

  it('otro usuario no puede editarla', async () => {
    const res = await request(app)
      .put(`/api/farms/${farmA.id}`)
      .set('Authorization', `Bearer ${tokenFor(userB.id)}`)
      .send({ name: 'Hackeada' });
    expect(res.status).toBe(404);
  });

  it('otro usuario no puede borrarla', async () => {
    const res = await request(app)
      .delete(`/api/farms/${farmA.id}`)
      .set('Authorization', `Bearer ${tokenFor(userB.id)}`);
    expect(res.status).toBe(404);
  });

  it('el listado de fincas de B no incluye la finca de A', async () => {
    const res = await request(app).get('/api/farms').set('Authorization', `Bearer ${tokenFor(userB.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.find((f) => f.id === farmA.id)).toBeUndefined();
  });

  it('sin token devuelve 401', async () => {
    const res = await request(app).get('/api/farms');
    expect(res.status).toBe(401);
  });

  it('con un token con firma inválida devuelve 401', async () => {
    const res = await request(app).get('/api/farms').set('Authorization', 'Bearer esto-no-es-un-jwt-valido');
    expect(res.status).toBe(401);
  });

  it('rechaza crear una finca sin nombre (validación de entrada)', async () => {
    const res = await request(app)
      .post('/api/farms')
      .set('Authorization', `Bearer ${tokenFor(userA.id)}`)
      .send({ location: 'Huila' });
    expect(res.status).toBe(400);
  });

  it('crea una finca válida y la persiste con el userId del token, no uno enviado por el cliente', async () => {
    const res = await request(app)
      .post('/api/farms')
      .set('Authorization', `Bearer ${tokenFor(userA.id)}`)
      .send({ name: 'Finca Nueva', userId: userB.id }); // intento de suplantar el dueño
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(userA.id);
    await prisma.farm.delete({ where: { id: res.body.id } });
  });
});

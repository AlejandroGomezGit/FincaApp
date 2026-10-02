const prisma = require('../config/prisma');
const authServiceClient = require('../services/authServiceClient');
const { farmAccessWhere } = require('../utils/farmAccess');

// Cualquier miembro con acceso a la finca (OWNER o COLLABORATOR) puede ver
// quién más tiene acceso.
exports.list = async (req, res, next) => {
  try {
    const farmId = Number(req.params.farmId);
    const farm = await prisma.farm.findFirst({ where: { id: farmId, ...farmAccessWhere(req.userId) } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const members = await prisma.farmMember.findMany({
      where: { farmId },
      orderBy: { createdAt: 'asc' },
    });
    const users = await authServiceClient.findUsersByIds(members.map((m) => m.userId));
    const byId = new Map(users.map((u) => [u.id, u]));
    res.json(members.map((m) => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
      userId: m.userId,
      name: byId.get(m.userId)?.name ?? '(usuario eliminado)',
      email: byId.get(m.userId)?.email ?? null,
    })));
  } catch (err) { next(err); }
};

// req.farm viene del middleware requireFarmOwner — solo el dueño invita.
exports.invite = async (req, res, next) => {
  try {
    const farmId = req.farm.id;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email requerido' });

    const user = await authServiceClient.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'No existe una cuenta de FincaApp con ese correo. Pídele que se registre primero.' });
    }

    const existing = await prisma.farmMember.findUnique({
      where: { farmId_userId: { farmId, userId: user.id } },
    });
    if (existing) return res.status(409).json({ message: 'Esa persona ya tiene acceso a la finca' });

    const member = await prisma.farmMember.create({
      data: { farmId, userId: user.id, role: 'COLLABORATOR' },
    });
    res.status(201).json({ id: member.id, role: member.role, createdAt: member.createdAt, userId: user.id, name: user.name, email: user.email });
  } catch (err) { next(err); }
};

// req.farm viene del middleware requireFarmOwner — solo el dueño quita gente.
exports.remove = async (req, res, next) => {
  try {
    const member = await prisma.farmMember.findFirst({
      where: { id: Number(req.params.memberId), farmId: req.farm.id },
    });
    if (!member) return res.status(404).json({ message: 'Colaborador no encontrado' });
    if (member.userId === req.farm.userId) {
      return res.status(400).json({ message: 'No puedes quitar al dueño de la finca' });
    }
    await prisma.farmMember.delete({ where: { id: member.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

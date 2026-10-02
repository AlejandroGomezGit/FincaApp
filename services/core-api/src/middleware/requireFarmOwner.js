// Para acciones que solo el dueño de la finca puede hacer (borrarla,
// invitar o quitar colaboradores) — a diferencia del resto del CRUD, donde
// cualquier miembro (OWNER o COLLABORATOR) tiene acceso completo.
const prisma = require('../config/prisma');
const { farmAccessWhere } = require('../utils/farmAccess');

module.exports = async (req, res, next) => {
  try {
    const farmId = Number(req.params.farmId || req.params.id);
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, ...farmAccessWhere(req.userId) },
    });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    if (farm.userId === req.userId) {
      req.farm = farm;
      return next();
    }

    const membership = await prisma.farmMember.findUnique({
      where: { farmId_userId: { farmId, userId: req.userId } },
    });
    if (membership?.role === 'OWNER') {
      req.farm = farm;
      return next();
    }

    return res.status(403).json({ message: 'Solo el dueño de la finca puede hacer esto' });
  } catch (err) { next(err); }
};

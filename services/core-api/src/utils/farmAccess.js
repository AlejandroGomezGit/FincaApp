// Fragmento de "where" de Prisma reutilizado en todos los controllers para
// decidir si un usuario puede ver/operar sobre una finca: o es el dueño
// original (Farm.userId), o aparece como colaborador invitado (FarmMember).
// Centralizado aquí para que "quién tiene acceso a una finca" tenga una sola
// definición en todo core-api.
exports.farmAccessWhere = (userId) => ({
  OR: [{ userId }, { members: { some: { userId } } }],
});

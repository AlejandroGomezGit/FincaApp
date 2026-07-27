module.exports = (err, req, res, next) => {
  console.error(err);

  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Registro no encontrado' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Ya existe un registro con esos datos' });
  }

  res.status(500).json({ message: 'Error interno del servidor' });
};

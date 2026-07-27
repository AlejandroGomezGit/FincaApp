module.exports = (err, req, res, next) => {
  if (req.log) req.log.error({ err }, 'unhandled_error');
  else console.error(err);

  res.status(500).json({ message: 'Error interno del servidor' });
};

module.exports = (role) => (req, res, next) => {
  if (req.userRole !== role) {
    return res.status(403).json({ message: 'No tienes permisos para esta acción' });
  }
  next();
};

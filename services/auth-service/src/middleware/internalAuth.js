// Protege el listener interno de auth-service: solo alcanzable dentro de la
// red del clúster/compose (nunca expuesto por el gateway/Ingress), reforzado
// además por este token compartido. Mismo patrón que core-api/internalAuth.
module.exports = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  next();
};

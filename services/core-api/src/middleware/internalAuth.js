// Protege el listener interno (weather-context, geocode callback): solo
// alcanzable dentro de la red del clúster/compose (nunca expuesto por el
// gateway/Ingress) y además exige este token compartido. Es un sustituto
// simplificado de mTLS/service-mesh real — ver ARCHITECTURE.md.
module.exports = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  next();
};

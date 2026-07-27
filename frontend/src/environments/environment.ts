// URL relativa a propósito: el frontend siempre se sirve detrás del mismo
// gateway/Ingress que expone la API (nginx en docker-compose, Ingress en
// Kubernetes), así que no hace falta (ni conviene) hardcodear host/puerto —
// funciona igual en local, en docker-compose y en cualquier dominio de k8s.
export const environment = {
  production: false,
  apiUrl: '/api',
};

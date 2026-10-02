// core-api no tiene acceso directo a la tabla User (auth-service es su
// dueño): para resolver un email a userId al invitar un colaborador, le
// pregunta al puerto interno de auth-service. Mismo patrón que
// weather-service/src/services/coreApiClient.js, en la dirección inversa.
const TIMEOUT_MS = 5000;

function baseUrl() {
  return process.env.AUTH_SERVICE_INTERNAL_URL || 'http://localhost:4021';
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

exports.findUserByEmail = async (email) => {
  const url = `${baseUrl()}/internal/users/by-email?email=${encodeURIComponent(email)}`;
  const res = await fetchWithTimeout(url, {
    headers: { 'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`auth-service internal error: ${res.status}`);
  return res.json();
};

exports.findUsersByIds = async (ids) => {
  if (!ids.length) return [];
  const url = `${baseUrl()}/internal/users/by-ids?ids=${ids.join(',')}`;
  const res = await fetchWithTimeout(url, {
    headers: { 'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN },
  });
  if (!res.ok) throw new Error(`auth-service internal error: ${res.status}`);
  return res.json();
};

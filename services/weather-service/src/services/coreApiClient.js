// weather-service no tiene base de datos propia: para saber la ubicación de
// una finca y sus actividades/cultivos activos, le pregunta a core-api por su
// puerto interno (no expuesto por el gateway/ingress, solo alcanzable dentro
// de la red del clúster/compose). El token compartido es un sustituto
// simplificado de mTLS/service-mesh real — ver ARCHITECTURE.md.
const TIMEOUT_MS = 8000;

function baseUrl() {
  return process.env.CORE_API_INTERNAL_URL || 'http://localhost:4011';
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

exports.getWeatherContext = async (farmId, userId) => {
  const url = `${baseUrl()}/internal/farms/${farmId}/weather-context?userId=${encodeURIComponent(userId)}`;
  const res = await fetchWithTimeout(url, {
    headers: { 'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`core-api internal error: ${res.status}`);
  return res.json();
};

exports.updateGeocode = async (farmId, { lat, lng, resolvedName }) => {
  try {
    await fetchWithTimeout(`${baseUrl()}/internal/farms/${farmId}/geocode`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN,
      },
      body: JSON.stringify({ lat, lng, resolvedName }),
    });
  } catch {
    // best-effort: si core-api no responde, el próximo request a /weather
    // simplemente reintentará el geocode. No debe tumbar la respuesta al usuario.
  }
};

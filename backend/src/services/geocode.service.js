const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryGeocode(query) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1&language=es&format=json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit) return null;

  const resolvedName = [hit.name, hit.admin1, hit.country].filter(Boolean).join(', ');
  return { lat: hit.latitude, lng: hit.longitude, resolvedName };
}

exports.geocodeLocation = async (locationText) => {
  if (!locationText || !locationText.trim()) return null;

  const segments = locationText.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  for (let i = 0; i < segments.length; i++) {
    const query = segments.slice(i).join(', ');
    try {
      const result = await tryGeocode(query);
      if (result) return result;
    } catch {
      // ignora fallos de red/timeout y prueba el siguiente fragmento
    }
  }
  return null;
};

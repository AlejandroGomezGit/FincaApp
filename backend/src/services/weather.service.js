const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 30 * 60 * 1000;

const cache = new Map();

function cacheKey(lat, lng) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

exports.getForecast = async (lat, lng) => {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: 'precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weathercode',
    timezone: 'auto',
    forecast_days: '7',
  });

  try {
    const res = await fetchWithTimeout(`${FORECAST_URL}?${params.toString()}`);
    if (!res.ok) return null;
    const raw = await res.json();
    const d = raw.daily;
    if (!d?.time) return null;

    const daily = d.time.map((date, i) => ({
      date,
      tempMax: d.temperature_2m_max[i],
      tempMin: d.temperature_2m_min[i],
      precipitationSum: d.precipitation_sum[i],
      precipitationProbability: d.precipitation_probability_max[i],
      weatherCode: d.weathercode[i],
    }));

    cache.set(key, { storedAt: Date.now(), data: daily });
    return daily;
  } catch {
    return null;
  }
};

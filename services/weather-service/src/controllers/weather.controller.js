const { geocodeLocation } = require('../services/geocode.service');
const weatherService = require('../services/weather.service');
const recommendations = require('../services/recommendations.service');
const coreApiClient = require('../services/coreApiClient');

exports.getForecast = async (req, res, next) => {
  try {
    const { farmId } = req.params;

    const context = await coreApiClient.getWeatherContext(farmId, req.userId);
    if (!context) return res.status(404).json({ message: 'Finca no encontrada' });

    let { lat, lng, locationResolved } = context;
    const { location, activities, crops } = context;

    if ((lat == null || lng == null) && location) {
      const geo = await geocodeLocation(location);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        locationResolved = geo.resolvedName;
        await coreApiClient.updateGeocode(farmId, { lat, lng, resolvedName: geo.resolvedName });
      }
    }

    if (lat == null || lng == null) {
      return res.json({ available: false, reason: location ? 'geocode_failed' : 'no_location' });
    }

    const daily = await weatherService.getForecast(lat, lng);
    if (!daily) {
      return res.json({ available: false, reason: 'weather_api_error' });
    }

    const recs = recommendations.generate({ dailyForecast: daily, activities, crops, today: new Date() });

    res.json({
      available: true,
      location: { lat, lng, resolvedName: locationResolved },
      daily,
      recommendations: recs,
    });
  } catch (err) { next(err); }
};

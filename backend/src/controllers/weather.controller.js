const prisma = require('../config/prisma');
const { geocodeLocation } = require('../services/geocode.service');
const weatherService = require('../services/weather.service');
const recommendations = require('../services/recommendations.service');

exports.getForecast = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    let farm = await prisma.farm.findFirst({ where: { id: Number(farmId), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    if ((farm.lat == null || farm.lng == null) && farm.location) {
      const geo = await geocodeLocation(farm.location);
      if (geo) {
        farm = await prisma.farm.update({
          where: { id: farm.id },
          data: { lat: geo.lat, lng: geo.lng, locationResolved: geo.resolvedName, geocodedAt: new Date() },
        });
      } else {
        await prisma.farm.update({ where: { id: farm.id }, data: { geocodedAt: new Date() } });
      }
    }

    if (farm.lat == null || farm.lng == null) {
      return res.json({ available: false, reason: farm.location ? 'geocode_failed' : 'no_location' });
    }

    const daily = await weatherService.getForecast(farm.lat, farm.lng);
    if (!daily) {
      return res.json({ available: false, reason: 'weather_api_error' });
    }

    const today = new Date();
    const in14Days = new Date(today.getTime() + 14 * 86400000);
    const [activities, crops] = await Promise.all([
      prisma.activity.findMany({
        where: {
          crop: { farmId: farm.id },
          status: { not: 'CANCELLED' },
          startDate: { lte: in14Days },
        },
        include: { crop: { select: { name: true, type: true } } },
      }),
      prisma.crop.findMany({ where: { farmId: farm.id } }),
    ]);

    const recs = recommendations.generate({ dailyForecast: daily, activities, crops, today });

    res.json({
      available: true,
      location: { lat: farm.lat, lng: farm.lng, resolvedName: farm.locationResolved },
      daily,
      recommendations: recs,
    });
  } catch (err) { next(err); }
};

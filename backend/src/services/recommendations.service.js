const MS_PER_DAY = 86400000;

const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2 };

const WEATHER_SENSITIVE_CROPS = ['CAFE', 'AGUACATE'];

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysFromToday(today, date) {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

function isActivityRelevant(activity, today, maxDaysAhead) {
  if (activity.status === 'CANCELLED') return false;
  if (activity.status === 'IN_PROGRESS') return true;
  const days = daysFromToday(today, new Date(activity.startDate));
  return days >= 0 && days <= maxDaysAhead;
}

function wasActivityRecent(activity, today, maxDaysAgo) {
  const days = daysFromToday(today, new Date(activity.startDate));
  return days < 0 && days >= -maxDaysAgo;
}

function byCategory(activities, category) {
  return activities.filter((a) => a.category === category);
}

exports.generate = ({ dailyForecast, activities, crops, today = new Date() }) => {
  const recs = [];
  const next = (n) => dailyForecast.slice(0, n);

  const fumigaciones = byCategory(activities, 'FUMIGACION').filter((a) => isActivityRelevant(a, today, 3));
  const lluviaProxima = next(2).some((d) => d.precipitationProbability >= 60);
  if (fumigaciones.length && lluviaProxima) {
    const maxProb = Math.max(...next(2).map((d) => d.precipitationProbability));
    for (const a of fumigaciones) {
      recs.push({
        id: `fumigacion-lluvia-${a.id}`,
        severity: 'warning',
        icon: 'opacity',
        title: 'Posponer fumigación por lluvia',
        message: `Se pronostica alta probabilidad de lluvia (${maxProb}%) en los próximos días. Considera posponer la fumigación de "${a.name}" para evitar que el producto se lave.`,
      });
    }
  }

  const fertilizaciones = byCategory(activities, 'FERTILIZACION').filter((a) => isActivityRelevant(a, today, 5));
  const diasSecos = next(2).every((d) => d.precipitationSum < 3);
  const lluviaModerada = dailyForecast[2] && dailyForecast[2].precipitationProbability >= 30 && dailyForecast[2].precipitationProbability <= 70;
  if (fertilizaciones.length && diasSecos && lluviaModerada) {
    for (const a of fertilizaciones) {
      const cropName = a.crop?.name || 'tu cultivo';
      recs.push({
        id: `fertilizacion-ventana-${a.id}`,
        severity: 'info',
        icon: 'eco',
        title: 'Buena ventana para fertilizar',
        message: `Los próximos días estarán secos con lluvia moderada después. Buen momento para fertilizar "${cropName}": la lluvia ayudará a que el fertilizante se absorba.`,
      });
    }
  }

  const cosechasEnCurso = byCategory(activities, 'COSECHA').filter((a) => isActivityRelevant(a, today, 0));
  const cultivosPorCosechar = crops.filter((c) => c.expectedHarvestDate && daysFromToday(today, new Date(c.expectedHarvestDate)) >= 0 && daysFromToday(today, new Date(c.expectedHarvestDate)) <= 5);
  const lluviaFuerte = next(3).some((d) => d.precipitationSum >= 20);
  if (lluviaFuerte && (cosechasEnCurso.length || cultivosPorCosechar.length)) {
    const maxMm = Math.max(...next(3).map((d) => d.precipitationSum)).toFixed(0);
    for (const a of cosechasEnCurso) {
      recs.push({
        id: `cosecha-lluvia-${a.id}`,
        severity: 'danger',
        icon: 'warning',
        title: 'Alerta de cosecha por lluvia fuerte',
        message: `Se esperan lluvias fuertes (≥${maxMm}mm) que podrían afectar la cosecha de "${a.crop?.name || 'tu cultivo'}". Si es posible, adelanta la recolección.`,
      });
    }
    for (const c of cultivosPorCosechar) {
      recs.push({
        id: `cosecha-esperada-lluvia-${c.id}`,
        severity: 'danger',
        icon: 'warning',
        title: 'Alerta de cosecha por lluvia fuerte',
        message: `Se esperan lluvias fuertes (≥${maxMm}mm) antes de la cosecha esperada de "${c.name}". Si es posible, adelanta la recolección.`,
      });
    }
  }

  const tramoCalurosoSeco = next(3).length === 3
    && (next(3).reduce((s, d) => s + d.tempMax, 0) / 3) >= 30
    && next(3).reduce((s, d) => s + d.precipitationSum, 0) < 5;
  if (tramoCalurosoSeco) {
    const riegosRecientes = byCategory(activities, 'RIEGO').filter((a) => wasActivityRecent(a, today, 5));
    const cropsConRiegoReciente = new Set(riegosRecientes.map((a) => a.cropId));
    const activeCrops = crops.filter((c) => c.status === 'ACTIVE' && !cropsConRiegoReciente.has(c.id));
    for (const c of activeCrops) {
      recs.push({
        id: `riego-calor-${c.id}`,
        severity: 'warning',
        icon: 'whatshot',
        title: 'Sugerencia de riego por calor y sequía',
        message: `Se esperan varios días calurosos y secos. Considera programar riego para "${c.name}".`,
      });
    }
  }

  const siembras = byCategory(activities, 'SIEMBRA').filter((a) => isActivityRelevant(a, today, 7));
  const lluviaFavorable = next(5).length === 5
    && next(5).reduce((s, d) => s + d.precipitationSum, 0) >= 10
    && next(5).reduce((s, d) => s + d.precipitationSum, 0) <= 40
    && next(5).every((d) => d.precipitationProbability < 80);
  if (siembras.length && lluviaFavorable) {
    for (const a of siembras) {
      recs.push({
        id: `siembra-favorable-${a.id}`,
        severity: 'info',
        icon: 'grass',
        title: 'Buen momento para siembra',
        message: `Las condiciones de humedad de los próximos días son favorables para sembrar "${a.crop?.name || 'tu cultivo'}".`,
      });
    }
  }

  const podas = byCategory(activities, 'PODA').filter((a) => isActivityRelevant(a, today, 5));
  const lluviaProximaPoda = next(2).some((d) => d.precipitationProbability >= 50);
  if (podas.length && lluviaProximaPoda) {
    for (const a of podas) {
      recs.push({
        id: `poda-lluvia-${a.id}`,
        severity: 'warning',
        icon: 'content_cut',
        title: 'Evitar poda antes de lluvia',
        message: `Podar en clima húmedo aumenta el riesgo de hongos en los cortes. Considera esperar a un periodo seco para podar "${a.crop?.name || 'tu cultivo'}".`,
      });
    }
  }

  const diaHelada = dailyForecast.find((d) => d.tempMin <= 5);
  const cultivosSensibles = crops.filter((c) => c.status === 'ACTIVE' && WEATHER_SENSITIVE_CROPS.includes(c.type));
  if (diaHelada && cultivosSensibles.length) {
    const fecha = parseLocalDate(diaHelada.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
    for (const c of cultivosSensibles) {
      recs.push({
        id: `helada-${c.id}`,
        severity: 'danger',
        icon: 'ac_unit',
        title: 'Riesgo de heladas',
        message: `Se esperan temperaturas mínimas bajas (${diaHelada.tempMin}°C) el ${fecha}. "${c.name}" es sensible al frío; considera medidas de protección.`,
      });
    }
  }

  if (recs.length === 0) {
    const totalLluvia = dailyForecast.reduce((s, d) => s + d.precipitationSum, 0);
    if (totalLluvia < 5) {
      recs.push({
        id: 'semana-tranquila',
        severity: 'info',
        icon: 'wb_sunny',
        title: 'Semana tranquila',
        message: 'Semana seca en tu zona: buen momento para labores de mantenimiento general, pero vigila el riego.',
      });
    } else {
      recs.push({
        id: 'semana-lluviosa',
        severity: 'info',
        icon: 'opacity',
        title: 'Semana lluviosa',
        message: `Se esperan lluvias esta semana (~${Math.round(totalLluvia)}mm acumulados). Es buen momento para el desarrollo de tus cultivos, pero vigila el drenaje y evita fumigar o podar hasta que mejore el clima.`,
      });
    }
  }

  return recs.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
};

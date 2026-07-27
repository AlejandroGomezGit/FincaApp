const { generate } = require('../services/recommendations.service');

const today = new Date(2026, 6, 27); // 27 jul 2026 (lunes), consistente con la fecha usada en el resto del proyecto

const dryWeek = () =>
  Array.from({ length: 7 }, (_, i) => ({
    date: `2026-07-${27 + i}`,
    tempMax: 24,
    tempMin: 14,
    precipitationSum: 0,
    precipitationProbability: 5,
    weatherCode: 0,
  }));

describe('recommendations.service — reglas puras', () => {
  it('sugiere posponer fumigación si hay alta probabilidad de lluvia próxima', () => {
    const daily = dryWeek();
    daily[0].precipitationProbability = 80;
    daily[1].precipitationProbability = 70;

    const activities = [{ id: 1, category: 'FUMIGACION', status: 'IN_PROGRESS', name: 'Fumigación roya', cropId: 1, crop: { name: 'Café' } }];
    const recs = generate({ dailyForecast: daily, activities, crops: [], today });

    expect(recs.some((r) => r.id === 'fumigacion-lluvia-1')).toBe(true);
    expect(recs[0].severity).toBeDefined();
  });

  it('no sugiere nada de fumigación si no hay actividad de FUMIGACION relevante', () => {
    const daily = dryWeek();
    daily[0].precipitationProbability = 90;
    const recs = generate({ dailyForecast: daily, activities: [], crops: [], today });
    expect(recs.some((r) => r.id.startsWith('fumigacion'))).toBe(false);
  });

  it('alerta de heladas para cultivos sensibles (café/aguacate) cuando la mínima baja de 5°C', () => {
    const daily = dryWeek();
    daily[3].tempMin = 3;
    const crops = [{ id: 5, name: 'Café Caturra', type: 'CAFE', status: 'ACTIVE' }];

    const recs = generate({ dailyForecast: daily, activities: [], crops, today });
    expect(recs.some((r) => r.id === 'helada-5' && r.severity === 'danger')).toBe(true);
  });

  it('no alerta heladas para cultivos no sensibles (ej. maíz)', () => {
    const daily = dryWeek();
    daily[3].tempMin = 2;
    const crops = [{ id: 5, name: 'Maíz', type: 'MAIZ', status: 'ACTIVE' }];

    const recs = generate({ dailyForecast: daily, activities: [], crops, today });
    expect(recs.some((r) => r.id === 'helada-5')).toBe(false);
  });

  it('cae en el mensaje de "semana tranquila" cuando ninguna regla aplica y no llueve', () => {
    const recs = generate({ dailyForecast: dryWeek(), activities: [], crops: [], today });
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe('semana-tranquila');
  });

  it('cae en el mensaje de "semana lluviosa" cuando ninguna regla aplica pero sí llueve mucho', () => {
    const daily = dryWeek().map((d) => ({ ...d, precipitationSum: 15 }));
    const recs = generate({ dailyForecast: daily, activities: [], crops: [], today });
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe('semana-lluviosa');
  });

  it('ordena las recomendaciones por severidad: danger antes que warning antes que info', () => {
    const daily = dryWeek();
    daily[0].precipitationProbability = 90; // dispara warning de fumigación
    daily[0].tempMin = 2; // dispara danger de helada

    const activities = [{ id: 1, category: 'FUMIGACION', status: 'IN_PROGRESS', name: 'Fumigación', crop: { name: 'Café' } }];
    const crops = [{ id: 9, name: 'Café', type: 'CAFE', status: 'ACTIVE' }];

    const recs = generate({ dailyForecast: daily, activities, crops, today });
    const severities = recs.map((r) => r.severity);
    const order = { danger: 0, warning: 1, info: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i - 1]]).toBeLessThanOrEqual(order[severities[i]]);
    }
  });

  it('no dispara reglas para actividades canceladas', () => {
    const daily = dryWeek();
    daily[0].precipitationProbability = 90;
    const activities = [{ id: 1, category: 'FUMIGACION', status: 'CANCELLED', name: 'Fumigación', crop: { name: 'Café' } }];
    const recs = generate({ dailyForecast: daily, activities, crops: [], today });
    expect(recs.some((r) => r.id === 'fumigacion-lluvia-1')).toBe(false);
  });
});

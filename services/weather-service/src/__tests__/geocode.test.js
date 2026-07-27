const { geocodeLocation } = require('../services/geocode.service');

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body };
}

describe('geocode.service — fallback progresivo', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('devuelve null para texto vacío sin llamar a la API', async () => {
    global.fetch = jest.fn();
    const result = await geocodeLocation('   ');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('resuelve en el primer intento cuando el string completo da resultado', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ results: [{ latitude: 4.6, longitude: -74.08, name: 'Bogotá', admin1: 'Bogotá D.C.', country: 'Colombia' }] })
    );

    const result = await geocodeLocation('Bogota, Colombia');
    expect(result).toEqual({ lat: 4.6, lng: -74.08, resolvedName: 'Bogotá, Bogotá D.C., Colombia' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('si el string completo no resuelve, reintenta quitando el primer segmento', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ results: [] })) // "Vereda El Roble, Neiva, Huila" -> nada
      .mockResolvedValueOnce(jsonResponse({ results: [{ latitude: 2.93, longitude: -75.28, name: 'Neiva', admin1: 'Huila', country: 'Colombia' }] }));

    const result = await geocodeLocation('Vereda El Roble, Neiva, Huila');
    expect(result).toEqual({ lat: 2.93, lng: -75.28, resolvedName: 'Neiva, Huila, Colombia' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('devuelve null si ningún fragmento resuelve', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ results: [] }));
    const result = await geocodeLocation('asdkjaskjd123notaplace');
    expect(result).toBeNull();
  });

  it('no lanza error si la API falla en un fragmento; sigue con el siguiente', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(jsonResponse({ results: [{ latitude: 1, longitude: 2, name: 'Huila', admin1: null, country: 'Colombia' }] }));

    const result = await geocodeLocation('Vereda X, Huila');
    expect(result).toEqual({ lat: 1, lng: 2, resolvedName: 'Huila, Colombia' });
  });
});

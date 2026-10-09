import { describe, expect, it } from 'vitest';
import { buildView, placeName, type ViewInput } from '../src/engine/view-model';
import { buildLocalModel } from '../src/engine/local-model';
import { buildWeatherBrief } from '../src/engine/weather-brief';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from '../src/types';

// Gardanne, Thursday 8 October 2026 at 17:40, the visual bench's frozen time.
const now = new Date('2026-10-08T17:40:00+02:00');
const sensor = (id: string, state: string | number, unit = '', attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id: id, state: String(state), attributes: { unit_of_measurement: unit, ...attributes } });
const weather: HassEntity = { entity_id: 'weather.home', state: 'partlycloudy', attributes: { friendly_name: 'Gardanne', temperature: 22.4, temperature_unit: '°C', humidity: 74,
  pressure: 1013, wind_speed: 8, wind_bearing: 200, attribution: 'Météo-France', wind_speed_unit: 'km/h' } };
const base: WeatherCardConfig = { type: 'custom:niak-weather-card', weather_entity: 'weather.home', location: 'Gardanne' };
const hass = (states: HassEntity[]): HomeAssistant => ({ states: Object.fromEntries([weather, { entity_id: 'sun.sun', state: 'above_horizon', attributes: { elevation: 20 } }, ...states].map(e => [e.entity_id, e])),
  language: 'fr', locale: { language: 'fr' }, config: { time_zone: 'Europe/Paris', latitude: 43.45 }, formatEntityName: e => e.entity_id, formatEntityState: e => e.state, callWS: async () => ({} as never) });
function view(config: WeatherCardConfig, states: HassEntity[], extra: Partial<ViewInput> = {}) {
  const h = hass(states), model = buildLocalModel(h, config, [], {}, now);
  return buildView({ hass: h, config, model, brief: buildWeatherBrief(h, config, model, [], now), hourly: [], daily: [], history: {}, rainHistory: {}, now, ...extra });
}

describe('Place name', () => {
  it('keeps the town of a Météo-France entity, and short names as they are', () => {
    expect(placeName('Météo-France forecast for city Auriol - Provence-Alpes-Côte d\'Azur (13) - FR Auriol')).toBe('Auriol');
    expect(placeName('Gardanne')).toBe('Gardanne');
    expect(placeName('Maison')).toBe('Maison');
  });
});

describe('View model', () => {
  it('hides station measurements that are not configured, but keeps a configured sensor that is unavailable', () => {
    const bare = view(base, []);
    expect(bare.rain).toBeDefined(); // the bulletin still says whether it rains
    expect(bare.wind?.source).toBe('Météo-France');
    const broken = view({ ...base, wind_speed_entity: 'sensor.wind' }, [sensor('sensor.wind', 'unavailable', 'km/h')]);
    expect(broken.wind).toMatchObject({ value: 8, source: 'Météo-France · repli' });
    expect(view({ ...base, pressure_entity: 'sensor.pressure' }, [sensor('sensor.pressure', 'unavailable', 'hPa')]).pressure?.source).toBe('Météo-France · repli');
  });

  it('shows the official vigilance and the rain measured at home together, without repeating them in the bubble', () => {
    const config = { ...base, vigilance_entity: 'sensor.vigilance', rain_rate_entity: 'sensor.rain', temperature_entity: 'sensor.t', humidity_entity: 'sensor.h' };
    const v = view(config, [sensor('sensor.vigilance', 'Jaune', '', { attribution: 'Data provided by Météo-France', Orages: 'Jaune' }), sensor('sensor.rain', 8.2, 'mm/h'),
      sensor('sensor.t', 22.4, '°C'), sensor('sensor.h', 78, '%')]);
    expect(v.alerts.map(a => a.label)).toEqual(['Vigilance jaune', 'Maintenant']);
    expect(v.alerts[1].text).toContain('8,2 mm/h');
    for (const a of v.alerts) expect(v.points.map(p => p.text)).not.toContain(a.text);
    // A downpour keeps its text white on the dark sky.
    expect(v.now).toMatchObject({ condition: 'pouring', darkSky: true });
  });

  it('explains the feel with its causes and today’s calculation', () => {
    const v = view({ ...base, temperature_entity: 'sensor.t', humidity_entity: 'sensor.h', wind_speed_entity: 'sensor.wind' },
      [sensor('sensor.t', 25, '°C'), sensor('sensor.h', 85, '%'), sensor('sensor.wind', 20, 'km/h')]);
    expect(v.comfort?.source).toBe('Station locale');
    expect(v.comfort?.factors.map(f => f.label)).toContain('humidité');
    expect(v.comfort?.example).toMatch(/^[\d,]+ °C \(humidex\).* = [\d,]+ °C ressentis$/);
    expect(v.comfort?.gap).toBeGreaterThan(0);
  });

  it('marks partial totals with « ≥ » and keeps labels short', () => {
    const config = { ...base, rain_total_entity: 'sensor.total', wind_gust_entity: 'sensor.gust' };
    const derived = { rain: { day: { partial: false }, recent: { value: 2, partial: true }, week: { value: 12.4, partial: true }, month: { value: 40, partial: false }, year: { partial: false } },
      days: [], gustMax: { value: 43, partial: true } };
    const v = view(config, [sensor('sensor.total', 500, 'mm'), sensor('sensor.gust', 20, 'km/h')], { derived });
    expect(v.rain?.stats).toEqual([{ label: 'Semaine', value: '≥ 12,4 mm', entity: 'sensor.total' }, { label: 'Mois', value: '40 mm', entity: 'sensor.total' }]);
    expect(v.rain?.label).toBe('Ces dernières 24 h · cumul partiel');
    expect(v.wind?.stats.find(s => s.label === 'Max. du jour')?.value).toBe('≥ 43 km/h');
  });

  it('keeps an Atmo sub-index visible when it is worse than the global index, for today and tomorrow', () => {
    const atmo = (id: string, value: number) => sensor(id, value, '', { 'Nom de la zone': 'Gardanne' });
    const config: WeatherCardConfig = { ...base, atmo_air_entity: 'sensor.air', atmo_o3_entity: 'sensor.o3', atmo_air_tomorrow_entity: 'sensor.air_j1', pollen_source: 'none' };
    const v = view(config, [atmo('sensor.air', 2), atmo('sensor.o3', 4), atmo('sensor.air_j1', 3)]);
    expect(v.air.today).toHaveLength(1);
    expect(v.air.today[0]).toMatchObject({ kind: 'air', zone: 'Gardanne', primary: { value: 2 }, worse: { label: 'O₃', reading: { value: 4 } } });
    expect(v.air.tomorrow[0]).toMatchObject({ tomorrow: true, primary: { value: 3 } });
    expect(view({ ...config, show_atmo_tomorrow: false }, [atmo('sensor.air', 2)]).air.tomorrow).toEqual([]);
  });

  it('names the days of the week, today first', () => {
    const daily = [0, 1, 2].map(i => ({ datetime: new Date(now.getTime() + i * 86400_000).toISOString(), condition: 'rainy', temperature: 20 + i, templow: 12, precipitation: 3 }));
    const v = view(base, [], { daily });
    expect(v.days.map(d => d.label)).toEqual(['Auj.', 'Ven', 'Sam']);
    expect(v.days[0]).toMatchObject({ today: true, icon: 'mdi:weather-rainy', high: 20, low: 12, rain: 3 });
  });

  it('says the pressure is stable rather than « 0 hPa »', () => {
    const config = { ...base, pressure_entity: 'sensor.pressure' };
    const h = hass([sensor('sensor.pressure', 1014, 'hPa')]), model = buildLocalModel(h, config, [], {}, now);
    model.attributes.baro = { d: 0, f: 180, s: 'stable', tx: 'temps installé' };
    const v = buildView({ hass: h, config, model, hourly: [], daily: [], history: {}, rainHistory: {}, now });
    expect(v.pressure?.trend).toMatchObject({ label: 'stable sur 3 h' });
    expect(v.pressure?.trend?.value).toBeUndefined();
  });
});

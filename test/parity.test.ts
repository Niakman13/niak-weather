import { describe, it, expect } from 'vitest';
import fixtures from '../reference/model-fixtures.json';
import { buildLocalModel, normaliseForecasts, measurement, trend, sourceFields, rainNarrative } from '../src/engine/local-model';
import type { HomeAssistant, WeatherCardConfig, HassEntity } from '../src/types';
import { candidates, detectEcowittStation } from '../src/editor/station-detection';

/** The feel sentence was rewritten in plain French; the cause the card picks must still match the template's. */
const plainFeel = (old: string) => old
  .replace('le ressenti colle au thermomètre', 'Ressenti égal au thermomètre')
  .replace('humidité indisponible — elle n’est pas comptée', 'Humidité inconnue : non prise en compte')
  .replace(/ — le vent en emporte [\d,]+ °C$/, ', à cause du vent')
  .replace(/ — l’averse en emporte [\d,]+ °C$/, ', à cause de la pluie')
  .replace(/ — le ciel dégagé en emporte [\d,]+ °C$/, ', à cause du ciel dégagé')
  .replace(/ — le soleil y est pour [\d,]+ °C$/, ', à cause du soleil')
  .replace(' — même le vent réchauffe, il n’apporte plus rien', ', à cause du vent chaud')
  .replace(' — c’est l’humidité qui pèse', ', à cause de l’humidité');
describe('original Jinja parity (96 independent weather situations)', () => {
  for (const [index, fixture] of fixtures.entries()) it(`matches original template ${index}`, () => {
    const config: WeatherCardConfig = { type: 'custom:niak-weather-card', weather_entity: 'weather.test' };
    const states: Record<string, HassEntity> = {};
    for (const [key, field] of Object.entries(sourceFields)) {
      if (key === 'meteo') continue;
      (config as any)[field] = 'sensor.' + key;
      states['sensor.' + key] = { entity_id: 'sensor.' + key, state: String((fixture.values as any)[key] ?? 'unknown'), attributes: {} };
    }
    states['weather.test'] = { entity_id: 'weather.test', state: fixture.condition, attributes: { cloud_coverage: fixture.cloud } };
    const hass = { states, language: 'fr', config: { time_zone: 'UTC' } } as HomeAssistant;
    const hours = fixture.hours.map(p => ({ datetime: '', condition: p.c, temperature: p.t, precipitation: p.p }));
    // The original template read humidex from Thermal Comfort: hand the fixture's value over unchanged.
    const a = buildLocalModel(hass, config, hours, {}, new Date('2026-10-04T10:00:00Z'), { humidex: (fixture.values as any).humidex }).attributes;
    for (const key of ['ressenti', 'base', 'effet_vent', 'effet_soleil', 'effet_pluie', 'effet_nuit', 'ecart_thermometre',
      'condition', 'cond_source', 'titre', 'niveau', 'alerte', 'sous_titre', 'phrase_ressenti', 'vent_deg', 'vent_rose', 'vent_secteur',
      'vent_nom', 'beaufort', 'beaufort_tx', 'pluie_dans', 'pluie_mm', 'pluie_recit', 'uv_tx']) {
      // Deliberate change: the template said "humidex indisponible" without Thermal Comfort; the card now knows
      // the humidity and explains the feel instead, so that phrase is no longer the template's.
      if (key === 'phrase_ressenti' && !((fixture.values as any).humidex > -900)) continue;
      const expected = key === 'phrase_ressenti' ? plainFeel(String((fixture.expected as any)[key])) : (fixture.expected as any)[key];
      expect(a[key], `case ${index}: ${key}`).toEqual(expected);
    }
  });
});
describe('data integrity and missing values', () => {
  it('converts non-metric stations to canonical model units', () => {
    expect(measurement(68, '°F', 'temperature')).toBe(20);
    expect(measurement(5, 'm/s', 'wind')).toBe(18);
    expect(measurement(1, 'in', 'rain')).toBe(25.4);
    expect(measurement(100100, 'Pa', 'pressure')).toBe(1001);
    expect(measurement('unavailable')).toBeUndefined();
  });
  it('removes openings advice from a legacy snapshot without discarding its station measurements', () => {
    const hass: HomeAssistant = { language:'fr', locale:{language:'fr'},
      states: { 'weather.test': { entity_id:'weather.test', state:'cloudy', attributes:{} } },
      formatEntityName: e => e.entity_id, formatEntityState: e => e.state, callWS: async () => { throw new Error('not used'); } };
    const a = buildLocalModel(hass, { type:'custom:niak-weather-card', weather_entity:'weather.test' }, [], {}, new Date(),
      { t_ext:20, humidex:21, vent:6, rafales:10, pluie_taux:1, pluie_jour:3, condition_prev:'cloudy' }).attributes;
    expect(a.titre).toBe('Il pleut'); expect(a.alerte).toBe(''); expect(a.sous_titre).toContain('1,0 mm/h');
    expect(a.sous_titre).not.toContain('ouvrant');
  });
  it('does not invent barometer trends before 20 minutes', () => {
    expect(trend([{ s: '1000', lu: 1000 }], 1005, 1500, 'pressure').d).toBe(-999);
    expect(trend([{ s: '1000', lu: 1000 }], 1005, 11800, 'pressure')).toMatchObject({ d: 5, f: 180, tx: 'amélioration' });
  });
  it('keeps the pressure reference at the three-hour boundary between recorded changes',()=>{
    const history=[{s:'1000',lu:1000},{s:'1000.2',lu:2000}];
    for(const now of [11800,11801,11860]) expect(trend(history,1001.1,now,'pressure')).toMatchObject({d:1.1,f:180,s:'hausse'});
    expect(trend(history,1001.1,12801,'pressure')).toMatchObject({d:.9,s:'stable'});
  });
  it('does not bridge an unavailable pressure reference',()=>{
    expect(trend([{s:'1000',lu:500},{s:'unavailable',lu:1000},{s:'1001',lu:11800}],1001.1,11801,'pressure').d).toBe(-999);
  });
  it('keeps cumulative counters nested, not summed', () => expect(rainNarrative(1, 1, 1)).toBe('tout ce qui est tombé ce mois-ci est tombé aujourd’hui'));
  it('uses the Home Assistant timezone, including midnight', () => {
    const f = normaliseForecasts([{ datetime: '2026-10-04T22:00:00Z', temperature: 18 }], [], new Date('2026-10-04T20:00:00Z'), 'Europe/Paris');
    expect(f.heures[0]).toMatchObject({ h: 0, j: 1 });
  });
  it('does not select indoor readings, dewpoint or the wrong rain period', () => {
    const states = Object.fromEntries(['outdoor_temperature', 'indoor_temperature', 'dewpoint', 'yearly_rain', 'relative_pressure', 'absolute_pressure'].map(k => {
      const id = 'sensor.wh3000_' + k; return [id, { entity_id: id, state: '1', attributes: {} }];
    }));
    expect(detectEcowittStation({ states })).toMatchObject({ temperature_entity: 'sensor.wh3000_outdoor_temperature', yearly_rain_entity: 'sensor.wh3000_yearly_rain', pressure_entity: 'sensor.wh3000_relative_pressure' });
    expect(detectEcowittStation({ states }).daily_rain_entity).toBeUndefined();
  });
  it('ignores Thermal Comfort sensors when detecting a station', () => {
    const states: Record<string, HassEntity> = {};
    for (const [id, state] of [['sensor.outdoor_temperature', '20'], ['sensor.outdoor_humidity', '60'], ['sensor.outside_dew_point', '12']] as const)
      states[id] = { entity_id: id, state, attributes: {} };
    const context = { devices: [], entities: [{ entity_id: 'sensor.outside_dew_point', platform: 'thermal_comfort', device_id: 'out' }] };
    expect(candidates({ states }, 'dew_point_entity', context)).toEqual([]);
    expect(detectEcowittStation({ states }, context)).not.toHaveProperty('thermal_device_id');
  });
  it('preserves manual choices and intentionally cleared fields', () => {
    const id = 'sensor.gw2000_outdoor_temperature', states = { [id]: { entity_id: id, state: '20', attributes: {} } };
    expect(detectEcowittStation({ states }, undefined, { temperature_entity: '' }).temperature_entity).toBeUndefined();
  });
});
describe('Daily wind from hourly forecasts', () => {
  it('keeps the strongest wind and the speed-weighted prevailing direction of each local day', async () => {
    const { dailyWind, normaliseForecasts } = await import('../src/engine/local-model');
    const now = new Date('2026-10-08T06:00:00Z');
    // Tomorrow (9 Oct, Paris): southerly 10 km/h in the morning, westerly 30 km/h gusting 50 in the afternoon.
    const hourly = Array.from({ length: 24 }, (_, h) => ({ datetime: new Date(Date.UTC(2026, 9, 8, 22 + h)).toISOString(), temperature: 15,
      wind_speed: h < 12 ? 10 : 30, wind_gust_speed: h < 12 ? 0 : 50, wind_bearing: h < 12 ? 180 : 270 }));
    const day = dailyWind(hourly, now, 'Europe/Paris').get(1)!;
    expect(day).toMatchObject({ v: 30, g: 50 });
    expect(day.b).toBeGreaterThan(240); expect(day.b).toBeLessThan(270);
    // A day with only two forecast hours has no meaningful maximum.
    expect(dailyWind(hourly.slice(0, 2), now, 'Europe/Paris').get(1)).toBeUndefined();
    // Converted from m/s like the station's wind.
    expect(dailyWind(hourly, now, 'Europe/Paris', 'm/s').get(1)!.v).toBe(108);
    const week = normaliseForecasts(hourly, [{ datetime: '2026-10-09T10:00:00Z', temperature: 20, templow: 12 }], now, 'Europe/Paris').jours[0];
    expect(week).toMatchObject({ e: 1, v: 30, vg: 50 });
  });
});

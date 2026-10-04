import { describe, it, expect } from 'vitest';
import fixtures from '../reference/model-fixtures.json';
import { buildLocalModel, normaliseForecasts, measurement, trend, sourceFields, rainNarrative } from '../src/local-model';
import type { HomeAssistant, WeatherCardConfig, HassEntity } from '../src/types';
import { candidates, detectEcowittStation } from '../src/station-detection';
import { renderLocal } from '../src/local-renderer';

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
    const a = buildLocalModel(hass, config, hours, {}, new Date('2026-10-04T10:00:00Z')).attributes;
    for (const key of ['ressenti', 'base', 'effet_vent', 'effet_soleil', 'effet_pluie', 'effet_nuit', 'ecart_thermometre',
      'condition', 'cond_source', 'titre', 'niveau', 'alerte', 'sous_titre', 'phrase_ressenti', 'vent_deg', 'vent_rose', 'vent_secteur',
      'vent_nom', 'beaufort', 'beaufort_tx', 'pluie_dans', 'pluie_mm', 'pluie_recit', 'uv_tx']) {
      expect(a[key], `case ${index}: ${key}`).toEqual((fixture.expected as any)[key]);
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
  it('filters Thermal Comfort by type and resolves the correct device from its input readings', () => {
    const states: Record<string, HassEntity> = {};
    for (const [id, state, attributes] of [
      ['sensor.outdoor_temperature', '20', {}], ['sensor.outdoor_humidity', '60', {}],
      ['sensor.renamed_outside_humidex', '23', { temperature: 20, humidity: 60 }],
      ['sensor.inside_humidex', '25', { temperature: 25, humidity: 40 }],
      ['sensor.outside_sensation_humidex', 'comfortable', {}],
    ] as const) states[id] = { entity_id: id, state, attributes };
    const context = { devices: [], entities: [
      { entity_id: 'sensor.renamed_outside_humidex', platform: 'thermal_comfort', device_id: 'out' },
      { entity_id: 'sensor.inside_humidex', platform: 'thermal_comfort', device_id: 'in' },
      { entity_id: 'sensor.outside_sensation_humidex', platform: 'thermal_comfort', device_id: 'out' },
    ] };
    expect(candidates({ states }, 'humidex_entity', context)).toEqual(['sensor.inside_humidex', 'sensor.renamed_outside_humidex']);
    expect(detectEcowittStation({ states }, context)).toMatchObject({ humidex_entity: 'sensor.renamed_outside_humidex', humidex_perception_entity: 'sensor.outside_sensation_humidex', thermal_device_id: 'out' });
  });
  it('preserves manual choices and intentionally cleared fields', () => {
    const id = 'sensor.gw2000_outdoor_temperature', states = { [id]: { entity_id: id, state: '20', attributes: {} } };
    expect(detectEcowittStation({ states }, undefined, { temperature_entity: '' }).temperature_entity).toBeUndefined();
  });
  it('renders the true SVG curve plus HTML axes/labels, daily bars and historical totals', () => {
    const a = fixtures[0].expected;
    const zones = renderLocal({ ent: 'model', ent_prev: 'prev' }, { model: { state: '21', attributes: a }, prev: { attributes: {
      heures: fixtures[0].hours, jours: [{ n: 'DIM', e: 0, t: 27, m: 17, p: .4, c: 'partlycloudy' }] } } }, {});
    expect(zones.heros).toContain('me-bulle'); expect(zones.bilan).toContain('536,9');
    expect(zones.courbe).toContain('me-lbl'); expect(zones.courbe).toContain('MAINTENANT'); expect(zones.courbe).toContain('DEMAIN');
    expect(zones.jours).toContain('AUJ.'); expect(zones.heros).not.toMatch(/onclick|window\./);
  });
});

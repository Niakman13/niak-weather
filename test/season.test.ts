import { describe, expect, it } from 'vitest';
import { currentSeason, dayLength, daylightText, seasonFromDate } from '../src/engine/season';
import { fillCategory, seasonCandidates } from '../src/editor/config-sources';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from '../src/types';

const config: WeatherCardConfig = { type: 'custom:niak-weather-card', weather_entity: 'weather.city' };
const hass = (states: Record<string, HassEntity> = {}, latitude: number | undefined = 43.45): HomeAssistant => ({ states, language: 'fr', locale: { language: 'fr' },
  config: { time_zone: 'Europe/Paris', latitude }, formatEntityName: e => e.entity_id, formatEntityState: e => e.state, callWS: async () => ({} as any) });
const sensor = (state: string): HassEntity => ({ entity_id: 'sensor.saison', state, attributes: { device_class: 'enum', options: ['spring', 'summer', 'autumn', 'winter'] } });
const at = (iso: string) => new Date(`${iso}T12:00:00+02:00`);

describe('Seasons', () => {
  it('follows equinoxes and solstices from the local date, flipped in the southern hemisphere', () => {
    expect(['2026-03-19', '2026-03-20', '2026-06-21', '2026-09-21', '2026-09-22', '2026-12-21', '2027-01-15'].map(d => seasonFromDate(at(d), 'Europe/Paris')))
      .toEqual(['winter', 'spring', 'summer', 'summer', 'autumn', 'winter', 'winter']);
    expect(seasonFromDate(at('2026-10-07'), 'Australia/Sydney', -33.9)).toBe('spring');
  });
  it('trusts the Season sensor, and falls back to the date when it has nothing usable', () => {
    const july = at('2026-07-14');
    expect(currentSeason(hass({ 'sensor.saison': sensor('autumn') }), { ...config, season_entity: 'sensor.saison' }, july)).toMatchObject({ season: 'autumn', source: 'sensor', label: 'Automne' });
    expect(currentSeason(hass({ 'sensor.saison': sensor('Automne') }), { ...config, season_entity: 'sensor.saison' }, july).season).toBe('autumn');
    expect(currentSeason(hass({ 'sensor.saison': sensor('unavailable') }), { ...config, season_entity: 'sensor.saison' }, july)).toMatchObject({ season: 'summer', source: 'date' });
    expect(currentSeason(hass(), config, july)).toMatchObject({ season: 'summer', source: 'date', icon: 'mdi:white-balance-sunny' });
  });
  it('dates the start of the season, on the astronomical or the meteorological calendar', () => {
    const dated = (iso: string, extra: Partial<WeatherCardConfig> = {}, states: Record<string, HassEntity> = {}, latitude = 43.45) => currentSeason(hass(states, latitude), { ...config, ...extra }, at(iso));
    expect(dated('2026-09-23')).toMatchObject({ season: 'autumn', daysIn: 1, start: { month: 9, day: 22 } });
    expect(dated('2026-10-07').daysIn).toBe(15);
    expect(dated('2027-01-03')).toMatchObject({ season: 'winter', daysIn: 13, start: { month: 12, day: 21 } });
    // A meteorological Season sensor turns to autumn on 1 September, before the equinox.
    expect(dated('2026-09-05', { season_entity: 'sensor.saison' }, { 'sensor.saison': sensor('autumn') })).toMatchObject({ season: 'autumn', daysIn: 4, start: { month: 9, day: 1 } });
    expect(dated('2026-09-25', {}, {}, -33.9)).toMatchObject({ season: 'spring', daysIn: 3 });
  });
  it('tells the day length and how fast it changes', () => {
    // Gardanne, 7 October: about 11 h 25 of daylight, shrinking by about 2.7 min a day.
    const info = currentSeason(hass(), config, at('2026-10-07'));
    expect(info.dayLength).toBeCloseTo(11.42, 1);
    expect(info.dayChange!).toBeLessThan(-2); expect(info.dayChange!).toBeGreaterThan(-3.5);
    expect(daylightText(info)).toMatch(/^11 h \d\d de jour · les jours raccourcissent de 3 min par jour$/);
    expect(dayLength(2026, 6, 21, 43.45)).toBeGreaterThan(15);
    // Home Assistant's sun.sun at Gardanne, 200 m, 8 October 2026: 11 h 27 min 22 s between sunrise and sunset.
    expect(Math.abs(dayLength(2026, 10, 8, 43.447, 200) - (11 + 27 / 60 + 22 / 3600)) * 60).toBeLessThan(2);
    expect(daylightText(currentSeason(hass({}, NaN), config, at('2026-10-07')))).toBe('');
  });
  it('finds the Season sensor automatically, by integration or by its four options', () => {
    const states = { 'sensor.saison': sensor('autumn'), 'sensor.other': { entity_id: 'sensor.other', state: 'x', attributes: {} } };
    expect(seasonCandidates({ states }, { entities: [], devices: [] })).toEqual(['sensor.saison']);
    expect(fillCategory(hass(states), { entities: [], devices: [] }, config, 'weather').season_entity).toBe('sensor.saison');
  });
});

import { describe, expect, it } from 'vitest';
import { comfortWord, dewPoint, frostPoint, humidex, humidexFeel, humidityFeel } from '../src/engine/humidity';
import { buildLocalModel } from '../src/engine/local-model';
import { buildWeatherBrief, type BriefPoint } from '../src/engine/weather-brief';
import { cleanConfig } from '../src/config';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from '../src/types';

const e = (id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id: id, state, attributes });
const hass = (states: Record<string, HassEntity>): HomeAssistant => ({ states, language: 'fr', locale: { language: 'fr' }, config: { time_zone: 'Europe/Paris' },
  formatEntityName: x => x.entity_id, formatEntityState: x => x.state, callWS: async () => ({} as any) });
const base: WeatherCardConfig = { type: 'custom:niak-weather-card', weather_entity: 'weather.city' };
const now = new Date('2026-10-04T10:00:00Z');

describe('Moisture computed by the card, without Thermal Comfort', () => {
  it('reproduces the Thermal Comfort sensors of a real GW2000A reading', () => {
    // 07/10/2026, Gardanne: 19.2 °C and 82 % gave dew point 16.068 °C and frost point 13.507 °C in Thermal Comfort.
    const dew = dewPoint(19.2, 82)!;
    expect(dew).toBeCloseTo(16.068, 3);
    expect(frostPoint(19.2, dew)).toBeCloseTo(13.507, 3);
    expect(humidex(30, 22)).toBeCloseTo(39.3, 1);
    expect(dewPoint(20, 0)).toBeUndefined();
  });
  it('names the overall feel on the UTCI grid and the moisture only when it matters', () => {
    expect([-20, -5, 5, 20, 28, 35, 40, 50].map(comfortWord)).toEqual(['Froid intense', 'Froid', 'Frais', 'Agréable', 'Chaud', 'Très chaud', 'Chaleur intense', 'Chaleur extrême']);
    expect(humidityFeel(22, 70, 30)).toBe('air très lourd');
    expect(humidityFeel(16.5, 80, 15)).toBe('');
    expect(humidityFeel(5, 25, 24)).toBe('air sec');
    expect(humidexFeel(36)).toBe('inconfort évident');
  });
  it('computes humidex from the station, the bulletin as a fallback, never over a configured station sensor', () => {
    const weather = e('weather.city', 'cloudy', { temperature: 18, humidity: 90 });
    const station = buildLocalModel(hass({ 'weather.city': weather, 'sensor.t': e('sensor.t', '30'), 'sensor.h': e('sensor.h', '60') }),
      { ...base, temperature_entity: 'sensor.t', humidity_entity: 'sensor.h' }, [], {}, now).attributes;
    expect(station).toMatchObject({ hum_source: 'station', base: 'humidex', confort: 'Chaleur intense' });
    expect(station.humidex).toBeCloseTo(humidex(30, dewPoint(30, 60)!), 1);
    const bulletin = buildLocalModel(hass({ 'weather.city': weather }), base, [], {}, now).attributes;
    expect(bulletin).toMatchObject({ hum_source: 'bulletin', base: 'humidex', hr_ext: 90 });
    expect(bulletin.rosee).toBeCloseTo(dewPoint(18, 90)!, 1);
    const broken = buildLocalModel(hass({ 'weather.city': weather, 'sensor.h': e('sensor.h', 'unavailable') }), { ...base, humidity_entity: 'sensor.h' }, [], {}, now).attributes;
    expect(broken).toMatchObject({ base: 'thermometre', humidex: -999 });
    expect(broken.phrase_ressenti).toBe('Humidité inconnue : non prise en compte');
  });
  it('does not call bulletin humidity a fog observed by the station', () => {
    const a = buildLocalModel(hass({ 'weather.city': e('weather.city', 'cloudy', { temperature: 8, humidity: 100 }) }), base, [], {}, now).attributes;
    expect(a.cond_source).toBe('prevision'); expect(a.brouillard_reel).toBe(false);
  });
  it('drops the old Thermal Comfort options from saved configurations', () => {
    const old = { ...base, humidex_entity: 'sensor.x', thermal_device_id: 'd', heat_index_entity: 'sensor.y' } as WeatherCardConfig;
    expect(cleanConfig(old)).toEqual(base);
  });
});

describe('Tonight in the brief: frost and fog', () => {
  const model = (a: Record<string, unknown>) => e('sensor.model', '10', { t_ext: 10, ressenti: 10, vent: 3, ...a });
  const night = (low: number, extra: Partial<BriefPoint> = {}): BriefPoint[] => [{ hours: 4, temperature: 9 }, { hours: 18, temperature: low, ...extra }];
  const brief = (a: Record<string, unknown>, points: BriefPoint[]) => buildWeatherBrief(hass({}), base, model(a), points, now).signals;
  it('warns of frost on the ground from +3 °C, white frost when the air is humid enough', () => {
    // now + 18 h = 06:00 in Paris
    expect(brief({ gelee: 1 }, night(2)).find(s => s.key === 'frost-night')).toMatchObject({ severity: 1, text: 'Gelée blanche possible vers 6 h : 2 °C prévus' });
    expect(brief({ gelee: -8 }, night(2)).find(s => s.key === 'frost-night')?.text).toBe('Gel au sol possible vers 6 h : 2 °C prévus');
    expect(brief({ gelee: -2 }, night(-1)).find(s => s.key === 'frost-night')?.text).toBe('Gel vers 6 h : -1 °C prévus');
    expect(brief({ gelee: 1 }, night(6)).some(s => s.key === 'frost-night')).toBe(false);
  });
  it('announces fog only when the air will saturate on a calm, dry night', () => {
    expect(brief({ rosee: 9 }, night(8)).find(s => s.key === 'fog-later')?.text).toBe('Brouillard possible vers 6 h');
    expect(brief({ rosee: 9, vent: 15 }, night(8)).some(s => s.key === 'fog-later')).toBe(false);
    expect(brief({ rosee: 9 }, night(8, { precipitation: 2 })).some(s => s.key === 'fog-later')).toBe(false);
    expect(brief({ rosee: 5 }, night(8)).some(s => s.key === 'fog-later')).toBe(false);
  });
  it('judges the night on its own forecast, so the line does not blink with the afternoon wind', () => {
    // Gardanne, 9 October: 7 °C forecast at the coldest hour, 95 % humidity, wind 3,6 km/h; at 14 h the station wind swings between 0 and 18 km/h.
    const tonight = night(7, { wind: 3.6, humidity: 95 });
    for (const vent of [2, 9, 15]) expect(brief({ rosee: 9, vent }, tonight).some(s => s.key === 'fog-later')).toBe(true);
    for (const rosee of [6.3, 9.5]) expect(brief({ rosee }, tonight).some(s => s.key === 'fog-later')).toBe(true);
    // A windy or less humid night: no fog, whatever the afternoon says.
    expect(brief({ rosee: 9, vent: 2 }, night(7, { wind: 14, humidity: 95 })).some(s => s.key === 'fog-later')).toBe(false);
    expect(brief({ rosee: 9, vent: 2 }, night(7, { wind: 3.6, humidity: 85 })).some(s => s.key === 'fog-later')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { buildWeatherBrief, type BriefPoint } from '../src/weather-brief';
import type { HomeAssistant, WeatherCardConfig, HassEntity } from '../src/types';

const now = new Date('2026-10-04T10:00:00Z');
const config: WeatherCardConfig = { type: 'custom:niak-weather-card', weather_entity: 'weather.test' };
const model = (attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id: 'sensor.model', state: '20', attributes: { t_ext: 20, ressenti: 20, humidex: 20, ...attributes } });
const hass = (states: Record<string, HassEntity> = {}): HomeAssistant => ({ states, language: 'fr', locale: { language: 'fr' }, config: { time_zone: 'Europe/Paris' }, formatEntityName: e => e.entity_id, formatEntityState: e => e.state, callWS: async () => ({} as any) });
const entity = (state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id: 'sensor.test', state, attributes });
const brief = (a = {}, points: BriefPoint[] = [], c = config, states = {}) => buildWeatherBrief(hass(states), c, model(a), points, now);

describe('Brief intelligent', () => {
  it('explains the current feeling without inventing reassuring forecasts', () => {
    const b = brief({ ressenti: 17, effet_vent: -3 });
    expect(b.summary).toContain('3 °C de moins'); expect(b.summary).toContain('Le vent accentue');
    expect(b.summary).toContain('prévisions indisponibles'); expect(b.summary).not.toContain('tout va bien');
  });
  it('explains humidex heat and flags its absence', () => {
    expect(brief({ ressenti: 23, humidex: 23 }).summary).toContain('L’humidité accentue');
    expect(brief({ humidex: -999, base: 'thermometre' }).caveats.join()).toContain('Humidex absent');
  });
  it('does not count missing sensors as calm or comfortable', () => {
    const b = brief({ ressenti: -999, t_ext: -999, humidex: -999, vent: -999, rafales: -999 });
    expect(b.available).toBe(false); expect(b.rgb).toBe('150,150,150'); expect(b.summary).toContain('Ressenti indisponible');
  });
  it.each([[29, 39, false], [30, 39, true], [0, 40, true]])('wind %s/gust %s boundaries', (vent, rafales, exists) => {
    expect(brief({ vent, rafales }).signals.some(s => s.key === 'wind')).toBe(exists);
  });
  it('combines strong wind, forecast rain, pollution and pollen instead of averaging them', () => {
    const b = brief({ vent: 45, rafales: 75 }, [{ hours: 2, precipitation: 6 }], { ...config, pollen_source: 'atmo', atmo_air_entity: 'sensor.air', atmo_grass_entity: 'sensor.grass' }, { 'sensor.air': entity('4'), 'sensor.grass': entity('5') });
    expect(b.label).toBe('Attention renforcée');
    expect(b.summary).toContain('rafales à 75'); expect(b.summary).toContain('Fortes pluies'); expect(b.summary).toContain('Air extérieur'); expect(b.summary).toContain('Pollens');
  });
  it('filters past rain and uses offset times, not positions in a sparse series', () => {
    const b = brief({}, [{ hours: -1, precipitation: 80 }, { hours: 4, precipitation: 6 }, { hours: 8, precipitation: 100 }]);
    expect(b.summary).toContain('environ 4 h'); expect(b.summary).toContain('6 mm'); expect(b.summary).not.toContain('186');
  });
  it('does not invent zero rainfall when quantities are missing', () => {
    const b = brief({}, [{ hours: 1 }, { hours: 2, precipitation: 5 }]);
    expect(b.caveats.join()).toContain('cumul peut être incomplet');
  });
  it('uses summed rain on the 6-hour window', () => {
    const b = brief({}, Array.from({ length: 6 }, (_, i) => ({ hours: i + 1, precipitation: 4 })));
    expect(b.signals.find(s => s.key === 'rain-future')).toMatchObject({ severity: 2 }); expect(b.summary).toContain('24 mm');
  });
  it('handles thunderstorms and freezing forecasts without claiming local detection', () => {
    const b = brief({}, [{ hours: 2, condition: 'lightning-rainy', temperature: -1 }]);
    expect(b.signals.map(s => s.key)).toContain('storm'); expect(b.signals.map(s => s.key)).toContain('freeze-future');
    expect(b.signals.find(s => s.key === 'storm')!.explanation).toContain('pas une détection');
  });
  it('ignores invalid or out-of-window forecast offsets', () => {
    expect(brief({}, [{ hours: NaN, precipitation: 50 }, { hours: 7, condition: 'hail' }]).signals).toHaveLength(0);
  });
  it('uses the worst pollutant, not an average with good indices', () => {
    const b = brief({}, [], { ...config, atmo_air_entity: 'sensor.air', atmo_pm25_entity: 'sensor.pm' }, { 'sensor.air': entity('1'), 'sensor.pm': entity('5') });
    expect(b.signals.find(s => s.key === 'air-false')!.text).toContain('PM2.5'); expect(b.label).toBe('Attention renforcée');
  });
  it('does not use Atmo 0, concentrations or stale levels as confirmed risks', () => {
    const b = brief({}, [], { ...config, atmo_air_entity: 'sensor.air', atmo_pm25_entity: 'sensor.pm', atmo_grass_entity: 'sensor.grass' }, { 'sensor.air': entity('0'), 'sensor.pm': entity('5', { 'Date de mise à jour': '2026-09-01' }), 'sensor.grass': entity('5', { unit_of_measurement: 'µg/m³' }) });
    expect(b.signals).toHaveLength(0); expect(b.caveats.join()).toContain('publication ancienne');
  });
  it('Atmo code 7 is an event, not the highest severity', () => {
    const b = brief({}, [], { ...config, atmo_air_entity: 'sensor.air' }, { 'sensor.air': entity('7') });
    expect(b.label).toBe('À surveiller'); expect(b.summary).toContain('Évènement');
  });
  it('distinguishes tomorrow from today', () => {
    expect(brief({}, [], { ...config, atmo_air_tomorrow_entity: 'sensor.air' }, { 'sensor.air': entity('5') }).summary).toContain('pour demain');
  });
  it('respects pollen disabled and source selection without duplicate legacy pollen', () => {
    const c = { ...config, pollen_source: 'none' as const, atmo_grass_entity: 'sensor.grass', pollens: [{ id: 'sensor.old', nom: 'Armoise' }] };
    const states = { 'sensor.grass': entity('6'), 'sensor.old': entity('high') };
    expect(brief({}, [], c, states).signals).toHaveLength(0);
    expect(brief({}, [], { ...c, pollen_source: undefined }, states).signals.some(s => s.key.startsWith('legacy'))).toBe(false);
    expect(brief({}, [], { ...c, pollen_source: 'legacy' }, states).signals[0].text).toContain('Armoise');
  });
  it.each(['orange', 'rouge', 'yellow'])('recognizes official %s without masking other issues', color => {
    const b = brief({ rafales: 80 }, [], { ...config, vigilance_entity: 'sensor.vig' }, { 'sensor.vig': entity(color, { attribution: 'Météo-France', Orages: color }) });
    expect(b.signals.some(s => s.key === 'official')).toBe(true); expect(b.summary).toContain('rafales');
    if (color === 'rouge') expect(b.label).toBe('Vigilance rouge officielle');
  });
  it('does not lower pollution severity because official vigilance is green', () => {
    const b = brief({}, [], { ...config, vigilance_entity: 'sensor.vig', atmo_air_entity: 'sensor.air' }, { 'sensor.vig': entity('Vert', { attribution: 'Météo-France' }), 'sensor.air': entity('6') });
    expect(b.label).toBe('Attention renforcée');
  });
  it('does not call arbitrary red sensor values official vigilance', () => {
    expect(brief({}, [], { ...config, vigilance_entity: 'sensor.vig' }, { 'sensor.vig': entity('red') }).signals).toHaveLength(0);
  });
  it('does not present an old vigilance as current', () => {
    const b = brief({}, [], { ...config, vigilance_entity: 'sensor.vig' }, { 'sensor.vig': { ...entity('Rouge', { attribution: 'Météo-France' }), last_updated: '2026-09-01' } });
    expect(b.signals).toHaveLength(0); expect(b.caveats.join()).toContain('ancienne');
  });
  it('never assigns red from calculated wind, heat, rain or pollen', () => {
    expect(brief({ ressenti: 45, vent: 120, rafales: 180, pluie_taux: 80 }).label).toBe('Attention renforcée');
  });
  it('raises attention for simultaneous wind and rain without pretending they will persist', () => {
    expect(brief({ vent: 35, pluie_taux: 1 }).signals.find(s => s.key === 'wind-rain')).toMatchObject({ severity: 2, group: 'now' });
  });
  it('does not consume stale attributes of an unavailable custom model', () => {
    const b = buildWeatherBrief(hass(), { ...config, model_entity: 'sensor.model' }, { ...model({ ressenti: 45, rafales: 90 }), state: 'unavailable' }, [], now);
    expect(b.signals).toHaveLength(0); expect(b.available).toBe(false);
  });
  it('does not apply a universal health risk threshold to a personalized indoor percentage', () => {
    const b = brief({}, [], { ...config, air_quality_entity: 'sensor.indoor' }, { 'sensor.indoor': entity('40', { unit_of_measurement: '%' }) });
    expect(b.signals.find(s => s.key === 'indoor-air')).toMatchObject({ severity: 0 });
    expect(b.summary).toContain('Indice d’air intérieur : 40 %');
    expect(brief({}, [], { ...config, air_quality_entity: 'sensor.indoor' }, { 'sensor.indoor': entity('80', { unit_of_measurement: 'ppm' }) }).signals).toHaveLength(0);
  });
  it('does not headline yellow vigilance when pollution sets the orange attention level', () => {
    const b = brief({}, [], { ...config, vigilance_entity: 'sensor.vig', atmo_air_entity: 'sensor.air' }, { 'sensor.vig': entity('Jaune', { attribution: 'Météo-France' }), 'sensor.air': entity('5') });
    expect(b.title).toContain('Air extérieur'); expect(b.summary).toContain('Vigilance Météo-France jaune');
  });
  it('normalizes underscore forecast conditions', () => {
    expect(brief({}, [{ hours: 1, condition: 'lightning_rainy' }]).signals.some(s => s.key === 'storm')).toBe(true);
  });
});

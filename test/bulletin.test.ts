import { describe, expect, it } from 'vitest';
import { buildBulletin } from '../src/bulletin';

/** Hourly forecast from `startIso` for `n` hours; `at(h)` gives the fields for hour offset h. */
const plan = (startIso: string, n: number, at: (h: number) => Record<string, unknown>) =>
  Array.from({ length: n }, (_, h) => ({ datetime: new Date(Date.parse(startIso) + h * 3600_000).toISOString(), ...at(h) }));
const paris = (iso: string) => new Date(iso);

describe('Daily bulletin', () => {
  it('reads the next four parts of the day in the morning, grouping the same sky', () => {
    // 8 Oct 2026, 09:30 Paris; forecasts from 10:00.
    const b = buildBulletin(plan('2026-10-08T08:00:00Z', 24, h => ({ condition: h < 10 ? 'sunny' : 'clear-night', temperature: 15 + Math.sin(h / 4) * 4, precipitation: 0, wind_speed: 8, wind_bearing: 270 })),
      paris('2026-10-08T07:30:00Z'), 'Europe/Paris')!;
    expect(b.periods.map(p => p.label)).toEqual(['Ce matin', 'Cet après-midi', 'Ce soir', 'Cette nuit']);
    expect(b.summary).toMatch(/^Beau temps ce matin, cet après-midi, ce soir et cette nuit\./);
    expect(b.summary).toContain('Pas de pluie attendue.');
    expect(b.summary).not.toMatch(/Vent/);
  });
  it('switches to tonight and tomorrow in the evening', () => {
    const b = buildBulletin(plan('2026-10-08T17:00:00Z', 24, () => ({ condition: 'cloudy', temperature: 12, wind_speed: 5 })), paris('2026-10-08T16:30:00Z'), 'Europe/Paris')!;
    expect(b.periods.map(p => p.label)).toEqual(['Ce soir', 'Cette nuit', 'Demain matin', 'Demain après-midi']);
    expect(b.summary).toMatch(/^Ciel couvert ce soir, cette nuit, demain matin et demain après-midi\. Autour de 12 °C\./);
  });
  it('lets storms and real rain lead, with amounts, and names strong wind with gusts', () => {
    // From 10:00 Paris: storm 14–18 h, light rain 18–20 h.
    const b = buildBulletin(plan('2026-10-08T08:00:00Z', 24, h => ({ condition: h >= 4 && h < 8 ? 'lightning-rainy' : h >= 8 && h < 10 ? 'rainy' : 'partlycloudy',
      temperature: 18, precipitation: h >= 4 && h < 8 ? 3 : h >= 8 && h < 10 ? .2 : 0, wind_speed: h >= 4 && h < 8 ? 35 : 10, wind_gust_speed: h >= 4 && h < 8 ? 70 : 0, wind_bearing: 225 })),
      paris('2026-10-08T07:30:00Z'), 'Europe/Paris')!;
    const afternoon = b.periods.find(p => p.label === 'Cet après-midi')!;
    expect(afternoon).toMatchObject({ condition: 'lightning-rainy', rain: 12 });
    expect(afternoon.text).toBe('Orages et pluie (12 mm). 18 °C. Vent du sud-ouest assez fort (35 km/h), rafales à 70 km/h.');
    expect(b.summary).toContain('Pluie cet après-midi : 12 mm au total.');
    expect(b.summary).toContain('Vent du sud-ouest assez fort (35 km/h), rafales à 70 km/h cet après-midi.');
    // A rainy pictogram with 0.4 mm over a period is not a rainy evening worth a line of its own.
    expect(b.periods.find(p => p.label === 'Ce soir')!.condition).not.toBe('rainy');
  });
  it('describes a change inside a period', () => {
    // From 10:00 Paris: cloudy until 15 h, then sunny.
    const b = buildBulletin(plan('2026-10-08T08:00:00Z', 20, h => ({ condition: h < 5 ? 'cloudy' : 'sunny', temperature: 20 })), paris('2026-10-08T07:30:00Z'), 'Europe/Paris')!;
    expect(b.periods.find(p => p.label === 'Cet après-midi')!.text.startsWith('Ciel couvert, puis ensoleillé.')).toBe(true);
    expect(b.summary).toMatch(/^Ciel couvert ce matin et cet après-midi, puis beau temps en cours d’après-midi, ce soir et cette nuit\./);
  });
  it('needs at least two parts of the day', () => {
    expect(buildBulletin(plan('2026-10-08T10:00:00Z', 2, () => ({ condition: 'sunny', temperature: 20 })), paris('2026-10-08T09:30:00Z'), 'Europe/Paris')).toBeUndefined();
  });
});

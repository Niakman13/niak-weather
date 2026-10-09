import { finite, measurement } from './local-model';
import { conditionIcon } from './current-weather';
import type { WeatherForecast } from '../types';
import { dateFormat, numberFormat } from '../intl-cache';

/** A part of the day in the bulletin: night 0–6 h, morning 6–12 h, afternoon 12–18 h, evening 18–24 h (local time). */
export interface BulletinPeriod {
  key: string; label: string; short: string; condition: string; icon: string; text: string; phrase: string;
  /** Sky at the start and at the end of the period, for the summary; `during` is "en cours d’après-midi". */
  early: string; late: string; night: boolean; during: string;
  /** "en début d’après-midi": the first half of a period whose sky changes. */
  start: string;
  tmin?: number; tmax?: number; rain: number; wind?: number; gust?: number; bearing?: number;
}
export interface Bulletin { summary: string; periods: BulletinPeriod[] }

const SLOTS = [
  { slot: 0, from: 0, names: ['cette nuit', 'cette nuit', 'la nuit suivante'], short: ['Nuit', 'Nuit', 'Nuit sv.'], start: 'en début de nuit', during: 'en fin de nuit' },
  { slot: 1, from: 6, names: ['ce matin', 'demain matin', 'après-demain matin'], short: ['Matin', 'Dem. matin', 'Matin'], start: 'en début de matinée', during: 'en fin de matinée' },
  { slot: 2, from: 12, names: ['cet après-midi', 'demain après-midi', 'après-demain après-midi'], short: ['Après-midi', 'Dem. après-midi', 'Après-midi'], start: 'en début d’après-midi', during: 'en fin d’après-midi' },
  { slot: 3, from: 18, names: ['ce soir', 'demain soir', 'après-demain soir'], short: ['Soirée', 'Dem. soir', 'Soirée'], start: 'en début de soirée', during: 'en fin de soirée' },
];
/** Most severe first: a storm or rain in a period outweighs the hours around it. */
const SEVERITY = ['lightning-rainy', 'lightning', 'hail', 'snowy', 'snowy-rainy', 'pouring', 'rainy', 'fog', 'windy', 'windy-variant', 'cloudy', 'partlycloudy', 'sunny', 'clear-night'];
const DAY: Record<string, string> = { sunny: 'ensoleillé', 'clear-night': 'ciel dégagé', partlycloudy: 'éclaircies', cloudy: 'ciel couvert', fog: 'brouillard',
  rainy: 'pluie', pouring: 'fortes pluies', lightning: 'orages', 'lightning-rainy': 'orages et pluie', hail: 'grêle', snowy: 'neige', 'snowy-rainy': 'pluie et neige',
  windy: 'venteux', 'windy-variant': 'venteux et nuageux', exceptional: 'conditions exceptionnelles' };
const NIGHT: Record<string, string> = { sunny: 'ciel dégagé', 'clear-night': 'ciel dégagé', partlycloudy: 'quelques nuages' };
const FROM = ['du nord', 'du nord-est', 'd’est', 'du sud-est', 'du sud', 'du sud-ouest', 'd’ouest', 'du nord-ouest'];

const nf = (v: number, d = 0) => numberFormat('fr-FR', { maximumFractionDigits: d }).format(v);
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
const parts = (date: Date, timeZone?: string) => Object.fromEntries(dateFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
const serial = (p: Record<string, string>) => Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
const rainy = (c: string) => ['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy', 'hail'].includes(c);

function dominant(conditions: string[], rain: number): string {
  const severe = SEVERITY.slice(0, 5).find(c => conditions.includes(c));
  if (severe) return severe;
  // Over several hours, less than 1 mm is a few drops: a rainy pictogram without it is not called rain.
  if (rain >= 1) return conditions.includes('pouring') || rain >= 8 ? 'pouring' : 'rainy';
  const counts = new Map<string, number>();
  for (const c of conditions.filter(c => !rainy(c))) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || SEVERITY.indexOf(a[0]) - SEVERITY.indexOf(b[0]))[0]?.[0] ?? conditions[0] ?? 'cloudy';
}
const phrase = (condition: string, night: boolean) => (night ? NIGHT[condition] : undefined) ?? DAY[condition] ?? 'temps variable';
function windText(v: number, gust?: number, bearing?: number): string {
  const strength = v < 10 ? 'faible' : v < 20 ? 'modéré' : v < 40 ? 'assez fort' : v < 60 ? 'fort' : 'très fort';
  const from = bearing === undefined ? '' : ' ' + FROM[Math.round(bearing / 45) % 8];
  const gusts = gust !== undefined && gust >= 40 && gust >= v + 10 ? `, rafales à ${nf(gust)} km/h` : '';
  return v < 10 ? `vent faible` : `vent${from} ${strength} (${nf(v)} km/h)${gusts}`;
}

/** A written forecast for the next four parts of the day, built from the provider's hourly forecast. */
export function buildBulletin(hourly: WeatherForecast[], now: Date, timeZone?: string, windUnit = 'km/h'): Bulletin | undefined {
  const today = serial(parts(now, timeZone));
  const groups = new Map<string, { day: number; slot: typeof SLOTS[number]; points: WeatherForecast[]; first: number }>();
  for (const p of hourly) {
    const t = Date.parse(p.datetime); if (!Number.isFinite(t) || t < now.getTime() - 3600_000) continue;
    const local = parts(new Date(t), timeZone), day = serial(local) - today, slot = SLOTS[Math.floor(+local.hour / 6)];
    const key = `${day}-${slot.slot}`, g = groups.get(key) ?? { day, slot, points: [], first: t };
    g.points.push(p); groups.set(key, g);
  }
  // The current part of the day needs two hours left to be worth a line; later ones need three forecast hours.
  const usable = [...groups.values()].sort((a, b) => a.first - b.first).filter((g, i) => g.points.length >= (i === 0 ? 2 : 3)).slice(0, 4);
  if (usable.length < 2) return;
  const periods = usable.map(g => {
    const night = g.slot.slot === 0 || (g.slot.slot === 3 && g.points.some(p => String(p.condition) === 'clear-night'));
    const conditions = g.points.map(p => String(p.condition ?? '').replaceAll('_', '-').replace('clear-night', 'sunny')).filter(Boolean);
    const rain = g.points.reduce((s, p) => s + Math.max(0, finite(p.precipitation) ?? 0), 0);
    const temps = g.points.map(p => finite(p.temperature)).filter((t): t is number => t !== undefined);
    const winds = g.points.map(p => measurement(p.wind_speed, windUnit, 'wind')).filter((v): v is number => v !== undefined);
    const gusts = g.points.map(p => measurement(p.wind_gust_speed, windUnit, 'wind')).filter((v): v is number => v !== undefined && v > 0);
    let x = 0, y = 0;
    for (const p of g.points) { const b = finite(p.wind_bearing), v = measurement(p.wind_speed, windUnit, 'wind') ?? 0; if (b !== undefined) { x += Math.sin(b * Math.PI / 180) * Math.max(v, .1); y += Math.cos(b * Math.PI / 180) * Math.max(v, .1); } }
    const condition = dominant(conditions, rain);
    // Evolution inside the period: a clear change between its first and second half.
    const half = Math.ceil(conditions.length / 2), early = dominant(conditions.slice(0, half), 0), late = dominant(conditions.slice(half), 0);
    const evolves = !rainy(condition) && !['lightning', 'lightning-rainy'].includes(condition) && phrase(early, night) !== phrase(late, night);
    const main = evolves ? `${phrase(early, night)}, puis ${phrase(late, night)}` : phrase(condition, night);
    const wind = winds.length ? Math.round(Math.max(...winds)) : undefined, gust = gusts.length ? Math.round(Math.max(...gusts)) : undefined;
    const bearing = x || y ? (Math.atan2(x, y) * 180 / Math.PI + 360) % 360 : undefined;
    const tmin = temps.length ? Math.round(Math.min(...temps)) : undefined, tmax = temps.length ? Math.round(Math.max(...temps)) : undefined;
    const bits = [cap(main) + (rain >= 1 ? ` (${nf(rain, 1)} mm)` : '')];
    if (tmin !== undefined) bits.push(tmin === tmax ? `${nf(tmin)} °C` : `${nf(tmin)} à ${nf(tmax!)} °C`);
    if (wind !== undefined) bits.push(cap(windText(wind, gust, bearing)));
    const d = Math.min(g.day, 2), label = g.slot.names[d];
    return { key: `${g.day}-${g.slot.slot}`, label: cap(label), short: g.slot.short[d], condition, icon: conditionIcon(condition, night),
      text: bits.join('. ') + '.', phrase: main, early: evolves ? early : condition, late: evolves ? late : condition, night,
      during: (g.day >= 1 ? 'demain ' : '') + g.slot.during, start: (g.day >= 1 ? 'demain ' : '') + g.slot.start, tmin, tmax, rain, wind, gust, bearing };
  });
  return { summary: summarise(periods), periods };
}

/** One readable paragraph: the sky as a sequence of states over time, then temperatures, rain and notable wind. */
function summarise(periods: BulletinPeriod[]): string {
  // Each period contributes its sky at the start, and its sky at the end when it changes; consecutive equal skies merge.
  const runs: Array<{ condition: string; when: string[]; day: boolean; night: boolean }> = [];
  const push = (condition: string, when: string, night: boolean) => {
    const last = runs.at(-1);
    if (last && last.condition === condition) { last.when.push(when); last.night ||= night; last.day ||= !night; }
    else runs.push({ condition, when: [when], day: !night, night });
  };
  for (const p of periods) {
    // A period whose sky changes reads "en début d’après-midi … en fin d’après-midi".
    push(p.early, p.late !== p.early ? p.start : p.label.toLowerCase(), p.night);
    if (p.late !== p.early) push(p.late, p.during, p.night);
  }
  const join = (xs: string[]) => xs.length < 2 ? xs[0] : `${xs.slice(0, -1).join(', ')} et ${xs.at(-1)}`;
  // Three parts of the day or more under the same sky: "ce soir et jusqu’à demain matin".
  const span = (xs: string[]) => xs.length >= 3 ? `${xs[0]} et jusqu’à ${xs.at(-1)}` : join(xs);
  const words = (r: typeof runs[number]) => r.condition === 'sunny' && r.day && r.night ? 'beau temps' : phrase(r.condition, r.night && !r.day);
  const parts = runs.map(r => `${words(r)} ${span(r.when)}`);
  const sky = cap(parts.length < 2 ? parts[0] : `${parts.slice(0, -1).join(', ')}, puis ${parts.at(-1)}`) + '.';
  const temps = periods.flatMap(p => [p.tmin, p.tmax]).filter((t): t is number => t !== undefined);
  const out = [sky];
  if (temps.length) {
    const lo = Math.min(...temps), hi = Math.max(...temps), warm = periods.find(p => p.tmax === hi), cold = periods.find(p => p.tmin === lo);
    out.push(lo === hi ? `Autour de ${nf(lo)} °C.` : `De ${nf(lo)} °C ${cold!.label.toLowerCase()} à ${nf(hi)} °C ${warm!.label.toLowerCase()}.`);
  }
  const wet = periods.filter(p => p.rain >= 1);
  out.push(wet.length ? `Pluie ${join(wet.map(p => p.label.toLowerCase()))} : ${nf(wet.reduce((s, p) => s + p.rain, 0), 1)} mm au total.` : 'Pas de pluie attendue.');
  const windy = periods.filter(p => (p.wind ?? 0) >= 30 || (p.gust ?? 0) >= 50).sort((a, b) => (b.gust ?? b.wind ?? 0) - (a.gust ?? a.wind ?? 0))[0];
  if (windy) out.push(cap(`${windText(windy.wind!, windy.gust, windy.bearing)} ${windy.label.toLowerCase()}.`));
  return out.join(' ');
}

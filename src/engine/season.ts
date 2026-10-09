import type { HomeAssistant, WeatherCardConfig } from '../types';
import { dateFormat } from '../intl-cache';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export interface SeasonInfo { season: Season; source: 'sensor' | 'date'; label: string; icon: string; dayLength?: number; dayChange?: number;
  /** Days since the season began (0 on its first day), when its start can be dated. */
  daysIn?: number; start?: { month: number; day: number } }

const order: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const names: Record<Season, string> = { spring: 'Printemps', summer: 'Été', autumn: 'Automne', winter: 'Hiver' };
const icons: Record<Season, string> = { spring: 'mdi:flower', summer: 'mdi:white-balance-sunny', autumn: 'mdi:leaf-maple', winter: 'mdi:snowflake' };
/** States of the Season integration, plus French spellings of renamed or template sensors. */
const aliases: Record<string, Season> = { spring: 'spring', printemps: 'spring', summer: 'summer', ete: 'summer', 'été': 'summer',
  autumn: 'autumn', fall: 'autumn', automne: 'autumn', winter: 'winter', hiver: 'winter' };

function localDate(now: Date, timeZone?: string) {
  const p = Object.fromEntries(dateFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(x => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day };
}

/** Astronomical season from the local date (equinoxes and solstices to the day), flipped south of the equator. */
export function seasonFromDate(now: Date, timeZone?: string, latitude = 45): Season {
  const { month, day } = localDate(now, timeZone), md = month * 100 + day;
  const north: Season = md >= 1221 || md < 320 ? 'winter' : md < 621 ? 'spring' : md < 922 ? 'summer' : 'autumn';
  return latitude < 0 ? order[(order.indexOf(north) + 2) % 4] : north;
}

const astronomical: Array<[number, number, Season]> = [[3, 20, 'spring'], [6, 21, 'summer'], [9, 22, 'autumn'], [12, 21, 'winter']];
const meteorological: Array<[number, number, Season]> = [[3, 1, 'spring'], [6, 1, 'summer'], [9, 1, 'autumn'], [12, 1, 'winter']];
/** Most recent start of `season` on or before the local date, on one calendar (seasons flipped south of the equator). */
function startOf(season: Season, calendar: typeof astronomical, year: number, month: number, day: number, south: boolean) {
  const flip = (s: Season) => south ? order[(order.indexOf(s) + 2) % 4] : s, today = Date.UTC(year, month - 1, day);
  const latest = [year - 1, year].flatMap(y => calendar.filter(([, , s]) => flip(s) === season).map(([m, d]) => ({ m, d, t: Date.UTC(y, m - 1, d) })))
    .filter(x => x.t <= today).sort((a, b) => b.t - a.t)[0];
  // The season must still be running on that calendar: its next boundary is after today.
  const next = latest && [year, year + 1].flatMap(y => calendar.map(([m, d]) => Date.UTC(y, m - 1, d))).filter(t => t > latest.t).sort((a, b) => a - b)[0];
  return latest && next !== undefined && today < next ? { month: latest.m, day: latest.d, days: Math.round((today - latest.t) / 86400000) } : undefined;
}

/**
 * Hours of daylight (sunrise to sunset, with refraction) for a calendar day; solar declination from the Sun's ecliptic longitude.
 * Like Home Assistant, the horizon dips with the home's elevation: about 1.5 min of difference with its sun times.
 */
export function dayLength(year: number, month: number, day: number, latitude: number, elevation = 0): number {
  const rad = Math.PI / 180, d = (Date.UTC(year, month - 1, day, 12) - Date.UTC(2000, 0, 1, 12)) / 86400000;
  const g = (357.529 + 0.98560028 * d) * rad, L = (280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
  const decl = Math.asin(Math.sin(23.439 * rad) * Math.sin(L)), phi = latitude * rad;
  const horizon = -0.833 - 2.076 * Math.sqrt(Math.max(0, elevation)) / 60;
  const cos = (Math.sin(horizon * rad) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  return cos <= -1 ? 24 : cos >= 1 ? 0 : 2 * Math.acos(cos) / rad / 15;
}

/** The configured Season sensor wins when it reports a known season; otherwise the date decides. */
export function currentSeason(hass: HomeAssistant, config: WeatherCardConfig, now = new Date()): SeasonInfo {
  const raw = String(hass.states[config.season_entity ?? '']?.state ?? '').toLowerCase().trim();
  const fromSensor = aliases[raw];
  const latitude = Number(hass.config?.latitude);
  const season = fromSensor ?? seasonFromDate(now, hass.config?.time_zone, Number.isFinite(latitude) ? latitude : 45);
  const info: SeasonInfo = { season, source: fromSensor ? 'sensor' : 'date', label: names[season], icon: icons[season] };
  // A Season sensor may follow astronomical (21 March…) or meteorological (1 March…) seasons: date the start on the calendar that matches.
  const today = localDate(now, hass.config?.time_zone), south = Number.isFinite(latitude) && latitude < 0;
  const start = startOf(season, astronomical, today.year, today.month, today.day, south)
    ?? (fromSensor ? startOf(season, meteorological, today.year, today.month, today.day, south) : undefined);
  if (start) { info.daysIn = start.days; info.start = { month: start.month, day: start.day }; }
  if (Number.isFinite(latitude)) {
    const { year, month, day } = localDate(now, hass.config?.time_zone);
    const elevation = Number(hass.config?.elevation) || 0;
    info.dayLength = dayLength(year, month, day, latitude, elevation);
    info.dayChange = (dayLength(year, month, day + 1, latitude, elevation) - info.dayLength) * 60;
  }
  return info;
}

/** "11 h 26 de jour · les jours raccourcissent de 2 min par jour" */
export function daylightText(info: SeasonInfo): string {
  if (info.dayLength === undefined || info.dayChange === undefined) return '';
  const h = Math.floor(info.dayLength), m = Math.round((info.dayLength - h) * 60), change = Math.abs(info.dayChange);
  const length = `${m === 60 ? h + 1 : h} h ${String(m === 60 ? 0 : m).padStart(2, '0')} de jour`;
  if (change < .5) return `${length} · durée du jour stable`;
  return `${length} · les jours ${info.dayChange > 0 ? 'rallongent' : 'raccourcissent'} de ${Math.round(change)} min par jour`;
}

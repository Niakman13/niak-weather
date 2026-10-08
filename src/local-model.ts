import type { HassEntity, HomeAssistant, WeatherCardConfig, WeatherForecast } from './types';
import { buildWeatherVerdict, round } from './weather-model';
import { comfortWord, dewPoint, frostPoint, humidex, humidexFeel, humidityFeel } from './humidity';

export type History = Record<string, Array<{ s: string; lu?: number; lc?: number }>>;
export const sourceFields = {
  t_ext: 'temperature_entity', hr_ext: 'humidity_entity',
  vent: 'wind_speed_entity', rafales: 'wind_gust_entity', vent_dir: 'wind_bearing_entity', pluie_taux: 'rain_rate_entity',
  pluie_jour: 'daily_rain_entity', pluie_24h: 'rain_24h_entity', pluie_semaine: 'weekly_rain_entity', pluie_mois: 'monthly_rain_entity',
  pluie_an: 'yearly_rain_entity', pluie_evenement: 'event_rain_entity', pression: 'pressure_entity', solaire: 'solar_radiation_entity',
  rosee: 'dew_point_entity', uv: 'uv_index_entity', lux: 'illuminance_entity', rafale_max_jour: 'max_daily_gust_entity',
  tend_temp: 'temperature_trend_entity', meteo: 'weather_entity', elevation: 'sun_elevation_entity',
} as const;

export function finite(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return;
  const n = Number(value);
  return Number.isFinite(n) && n > -900 ? n : undefined;
}

/** All calculations use the canonical local units: °C, km/h, mm, hPa, W/m², lx. */
export function measurement(value: unknown, unit: unknown = '', kind = ''): number | undefined {
  const n = finite(value); if (n === undefined) return;
  const u = String(unit).toLowerCase().trim();
  if (kind === 'temperature') return u.includes('f') ? (n - 32) * 5 / 9 : u === 'k' ? n - 273.15 : n;
  if (kind === 'temperature_delta') return u.includes('f') ? n * 5 / 9 : n;
  if (kind === 'wind') return u === 'm/s' ? n * 3.6 : u === 'mph' ? n * 1.609344 : /^(kn|kt|kts|knots?)$/.test(u) ? n * 1.852 : n;
  if (kind === 'rain') return u.includes('in') ? n * 25.4 : n;
  if (kind === 'pressure') return u === 'pa' ? n / 100 : u === 'kpa' ? n * 10 : u === 'inhg' ? n * 33.86389 : u === 'mmhg' ? n * 1.333224 : n;
  if (kind === 'solar') return u.includes('kw') ? n * 1000 : n;
  return n;
}
export function kindFor(key: string): string {
  return key === 'tend_temp' ? 'temperature_delta' : /^(t_ext|humidex|rosee)$/.test(key) ? 'temperature' : /^(vent|rafales|rafale_max_jour)$/.test(key) ? 'wind'
    : key.startsWith('pluie_') ? 'rain' : key === 'pression' ? 'pressure' : key === 'solaire' ? 'solar' : '';
}

function parts(date: Date, timeZone?: string) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
}
/** Strongest wind and prevailing direction (speed-weighted) per local day, from hourly forecasts; daily forecasts carry no wind. */
export function dailyWind(hourly: WeatherForecast[], now = new Date(), timeZone?: string, unit = 'km/h') {
  const serial = (p: Record<string, string>) => Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000, today = serial(parts(now, timeZone));
  const days = new Map<number, { v: number; g?: number; x: number; y: number; n: number }>();
  for (const p of hourly) {
    const d = new Date(p.datetime), speed = measurement(p.wind_speed, unit, 'wind'), bearing = finite(p.wind_bearing);
    if (!Number.isFinite(d.getTime()) || speed === undefined || d.getTime() < now.getTime() - 3600_000) continue;
    const day = serial(parts(d, timeZone)) - today, cur = days.get(day) ?? { v: 0, x: 0, y: 0, n: 0 }, gust = measurement(p.wind_gust_speed, unit, 'wind');
    cur.v = Math.max(cur.v, speed); cur.n++;
    if (gust !== undefined && gust > 0) cur.g = Math.max(cur.g ?? 0, gust);
    if (bearing !== undefined) { cur.x += Math.sin(bearing * Math.PI / 180) * Math.max(speed, .1); cur.y += Math.cos(bearing * Math.PI / 180) * Math.max(speed, .1); }
    days.set(day, cur);
  }
  // A day needs a few hours of forecast to have a meaningful maximum (today counts from now on).
  return new Map([...days].filter(([day, w]) => w.n >= (day === 0 ? 1 : 6)).map(([day, w]) => [day, { v: round(w.v, 0), g: w.g === undefined ? undefined : round(w.g, 0),
    b: w.x || w.y ? round((Math.atan2(w.x, w.y) * 180 / Math.PI + 360) % 360, 0) : undefined }]));
}

export function normaliseForecasts(hourly: WeatherForecast[], daily: WeatherForecast[], now = new Date(), timeZone?: string, windUnit = 'km/h') {
  const today = parts(now, timeZone);
  const daySerial = (p: Record<string, string>) => Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
  const normal = (p: WeatherForecast) => {
    const d = new Date(p.datetime); if (!Number.isFinite(d.getTime())) return;
    const local = parts(d, timeZone);
    return { ...p, h: +local.hour, j: daySerial(local) - daySerial(today),
      c: String(p.condition ?? '').replaceAll('_', '-'), t: finite(p.temperature), p: round(finite(p.precipitation) ?? 0) };
  };
  const heures = hourly.slice(0, 18).map(normal).filter(p => p !== undefined).map(p => ({ h: p.h, j: p.j,
    c: p.c, t: p.t === undefined ? null : round(p.t), p: p.p }));
  const wind = dailyWind(hourly, now, timeZone, windUnit);
  const jours = daily.slice(0, 7).map(normal).filter(p => p !== undefined).map(p => {
    const local = parts(new Date(p.datetime), timeZone), weekday = new Date(Date.UTC(+local.year, +local.month - 1, +local.day)).getUTCDay();
    const w = wind.get(p.j);
    return { n: ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'][weekday], e: p.j, c: p.c,
      t: p.t === undefined ? null : round(p.t, 0), m: finite(p.templow) === undefined ? null : round(p.templow!, 0), p: p.p,
      v: w?.v ?? null, vg: w?.g ?? null, vb: w?.b ?? null };
  });
  return { heures, jours };
}

export function trend(history: History[string] = [], value: number | undefined, now: number, kind: 'wind' | 'pressure', unit = '') {
  const window = kind === 'pressure' ? 10800 : 3600, min = kind === 'pressure' ? 20 : 15;
  const points = history.map(p => ({ t: p.lu ?? p.lc ?? 0, v: measurement(p.s, unit, kind) }))
    .filter(p => p.t <= now).sort((a, b) => a.t - b.t);
  // Recorder records changes, not regular samples: the state just before the
  // window remains the reference until the next change (unless unavailable).
  const boundary = [...points].reverse().find(p => p.t <= now - window);
  const first = boundary?.v !== undefined ? boundary : points.find(p => p.t >= now - window && p.v !== undefined);
  const f = first ? round(Math.min(window, now - first.t) / 60, 0) : 0;
  const d = first && value !== undefined && f >= min ? round(value - first.v!) : undefined;
  const limit = kind === 'pressure' ? 1 : 3;
  const s = d === undefined ? '' : d >= limit ? 'hausse' : d <= -limit ? 'baisse' : 'stable';
  const a = Math.abs(d ?? 0);
  const tx = d === undefined ? '' : kind === 'wind'
    ? s === 'hausse' ? 'le vent se lève' : s === 'baisse' ? 'le vent faiblit' : 'vent régulier'
    : a < 1 ? 'temps installé' : s === 'baisse' ? a >= 6 ? 'chute rapide' : a >= 3 ? 'le temps se gâte' : 'légère baisse'
    : a >= 6 ? 'ça se dégage' : a >= 3 ? 'amélioration' : 'légère hausse';
  return { d: d ?? -999, f, s, tx };
}

const fr = (n: number | undefined, d = 1) => n === undefined ? '—' : round(n, d).toFixed(d).replace('.', ',');
const conditions: Record<string, string> = { sunny: 'Grand soleil', 'clear-night': 'Nuit claire', partlycloudy: 'Éclaircies',
  cloudy: 'Ciel couvert', fog: 'Brouillard', rainy: 'Pluvieux', pouring: 'Fortes pluies', lightning: 'Orageux',
  'lightning-rainy': 'Orages et pluie', hail: 'Grêle', snowy: 'Neige', 'snowy-rainy': 'Pluie et neige', windy: 'Venteux',
  'windy-variant': 'Venteux', exceptional: 'Conditions exceptionnelles' };
const sectors = ['Nord', 'Nord-Nord-Est', 'Nord-Est', 'Est-Nord-Est', 'Est', 'Est-Sud-Est', 'Sud-Est', 'Sud-Sud-Est',
  'Sud', 'Sud-Sud-Ouest', 'Sud-Ouest', 'Ouest-Sud-Ouest', 'Ouest', 'Ouest-Nord-Ouest', 'Nord-Ouest', 'Nord-Nord-Ouest'];
const roses = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const beauforts = ['calme', 'très légère brise', 'légère brise', 'petite brise', 'jolie brise', 'bonne brise', 'vent frais',
  'grand frais', 'coup de vent', 'fort coup de vent', 'tempête', 'violente tempête', 'ouragan'];

export function buildLocalModel(hass: HomeAssistant, config: WeatherCardConfig, hourly: WeatherForecast[], history: History = {}, now = new Date(), snapshot?: Record<string, unknown>): HassEntity {
  const weather = hass.states[config.weather_entity], a: Record<string, any> = {}, sources: Record<string, string> = {};
  for (const [key, field] of Object.entries(sourceFields)) {
    const id = config[field as keyof WeatherCardConfig]; if (typeof id !== 'string') continue;
    sources[key] = id;
    const e = hass.states[id]; a[key] = measurement(e?.state, e?.attributes.unit_of_measurement, kindFor(key)) ?? -999;
  }
  if (snapshot) for (const key of Object.keys(sourceFields)) if (snapshot[key] !== undefined) a[key] = snapshot[key];
  a.sources = sources;
  const metric = (key: string) => finite(a[key]);
  // A configured unavailable station sensor must not be replaced silently by a forecast measurement.
  const temperature = snapshot || config.temperature_entity ? metric('t_ext') : measurement(weather?.attributes.temperature, weather?.attributes.temperature_unit, 'temperature');
  a.t_ext = temperature ?? -999;
  if (!config.temperature_entity) sources.t_ext = config.weather_entity;
  const sun = hass.states[config.sun_entity ?? 'sun.sun'];
  a.elevation = metric('elevation') ?? finite(sun?.attributes.elevation) ?? 0;
  const solarTime = (field: string, fallback: number) => {
    const date = new Date(String(sun?.attributes[field] ?? ''));
    if (!Number.isFinite(date.getTime())) return fallback;
    const local = parts(date, hass.config?.time_zone); return round(+local.hour + +local.minute / 60, 2);
  };
  a.lever = solarTime('next_rising', 6.5); a.coucher = solarTime('next_setting', 21);
  // Humidity, dew point, frost point and humidex are computed here: no Thermal Comfort integration needed.
  // Station first; without a station humidity, the bulletin's own temperature/humidity pair gives the dew point,
  // the quantity that varies least from one place to the next. Like the temperature, a configured but
  // unavailable station sensor is never silently replaced by the bulletin.
  const bulletinT = measurement(weather?.attributes.temperature, weather?.attributes.temperature_unit, 'temperature');
  const bulletinH = finite(weather?.attributes.humidity);
  const stationH = metric('hr_ext');
  const useBulletin = !snapshot && !config.humidity_entity && bulletinH !== undefined;
  if (useBulletin) { a.hr_ext = bulletinH; sources.hr_ext = config.weather_entity; }
  const dew = temperature !== undefined && stationH !== undefined ? dewPoint(temperature, stationH)
    : metric('rosee') ?? (useBulletin && bulletinT !== undefined ? dewPoint(bulletinT, bulletinH!) : undefined);
  if (metric('rosee') === undefined && dew !== undefined) { a.rosee = round(dew); sources.rosee = sources.hr_ext ?? config.weather_entity; }
  a.hum_source = stationH !== undefined || config.dew_point_entity && metric('rosee') !== undefined ? 'station' : useBulletin ? 'bulletin' : '';
  // A humidex handed over explicitly (legacy snapshot, parity fixtures), even a missing one, is kept as is.
  const handed = snapshot !== undefined && Object.hasOwn(snapshot, 'humidex');
  // Humidex measures heat discomfort only: in cold or dry air it falls below the thermometer and would make
  // the feel colder for no reason. The card then starts from the thermometer, humidity being known but not a factor.
  const computed = temperature !== undefined && dew !== undefined ? round(humidex(temperature, dew)) : undefined;
  a.humidex = handed ? finite(snapshot!.humidex) ?? -999 : computed !== undefined && computed > temperature! ? computed : -999;
  if (metric('humidex') !== undefined) sources.humidex = sources.hr_ext ?? sources.rosee ?? config.weather_entity;
  a.gelee = temperature !== undefined && dew !== undefined ? round(frostPoint(temperature, dew)) : -999;
  const v = buildWeatherVerdict({ temperature, humidity: metric('hr_ext'), humidex: metric('humidex'), windSpeed: metric('vent'),
    windGust: metric('rafales'), solarRadiation: metric('solaire'), sunElevation: a.elevation, rainRate: metric('pluie_taux'),
    // Observed fog needs the station's own moisture, never the bulletin's.
    dewPoint: a.hum_source === 'station' ? metric('rosee') : undefined, uvIndex: metric('uv'), cloudCoverage: finite(weather?.attributes.cloud_coverage) }, String(snapshot?.condition_prev ?? weather?.state ?? ''), hourly.slice(0, 18));
  a.ressenti = v.apparentTemperature ?? -999; a.base = metric('humidex') === undefined ? 'thermometre' : 'humidex';
  a.perception = metric('humidex') === undefined ? '' : humidexFeel(metric('humidex')!);
  a.confort = comfortWord(v.apparentTemperature);
  a.humidite_tx = humidityFeel(dew, metric('hr_ext'), v.apparentTemperature);
  a.effet_vent = v.effects.wind; a.effet_soleil = v.effects.sun; a.effet_pluie = v.effects.rain; a.effet_nuit = v.effects.night;
  const measuredWind = metric('vent');
  a.vent_eff = measuredWind === undefined || measuredWind < 0 ? -999 : round(Math.max(0, measuredWind * .75 + Math.max(measuredWind, metric('rafales') ?? measuredWind) * .25 - 3));
  a.soleil_reel = (metric('solaire') ?? -999) >= 350;
  a.brouillard_reel = a.hum_source === 'station' && (metric('hr_ext') ?? -999) >= 97 && temperature !== undefined && metric('rosee') !== undefined
    && temperature - metric('rosee')! <= .4 && (metric('pluie_taux') ?? 0) < .3;
  a.ecart_thermometre = temperature === undefined || v.apparentTemperature === undefined ? -999 : round(v.apparentTemperature - temperature);
  a.condition = v.condition; a.condition_prev = weather?.state; a.cond_source = v.conditionSource === 'station' ? 'station' : 'prevision';
  const alertNames = { thunderstorm: 'orage', downpour: 'averse', gusts: 'rafales', heatwave: 'canicule', frost: 'gel', heat: 'chaleur', cold: 'froid', uv: 'uv' };
  a.alerte = v.alert ? alertNames[v.alert] : ''; a.niveau = v.level === 'optimized' ? 'optimise' : v.level;
  a.pluie_force = v.rainLevel; a.pluie_dans = v.nextRainHours ?? (hourly.length ? -1 : -2); a.pluie_mm = v.nextRainAmount ?? 0;
  a.titre = v.rainLevel && !v.condition.startsWith('snow') ? ['', 'Bruine', 'Il pleut', 'Grosse averse', 'Déluge'][v.rainLevel] : conditions[v.condition] ?? 'Dehors';
  const uv = metric('uv'); a.uv_tx = uv === undefined || uv < 0 ? '' : uv < 3 ? 'faible' : uv < 6 ? 'modéré' : uv < 8 ? 'fort' : uv < 11 ? 'très fort' : 'extrême';
  const wind = metric('vent'); a.beaufort = wind === undefined || wind < 0 ? -1 : [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118].filter(n => wind >= n).length;
  a.beaufort_tx = beauforts[a.beaufort] ?? '';
  a.vent_deg = wind !== undefined && wind >= 5 ? round(metric('vent_dir') ?? -1, 0) : -1;
  const sector = a.vent_deg < 0 ? -1 : round(a.vent_deg / 22.5, 0) % 16;
  a.vent_rose = roses[sector] ?? ''; a.vent_secteur = sectors[sector] ?? '';
  a.vent_nom = a.vent_secteur ? (/[EO]/.test(a.vent_secteur[0]) ? 'de l’' : 'du ') + a.vent_secteur : '';
  const ts = now.getTime() / 1000;
  a.baro = trend(history[config.pressure_entity ?? ''], metric('pression'), ts, 'pressure', String(hass.states[config.pressure_entity ?? '']?.attributes.unit_of_measurement ?? ''));
  a.vent_t = trend(history[config.wind_speed_entity ?? ''], wind, ts, 'wind', String(hass.states[config.wind_speed_entity ?? '']?.attributes.unit_of_measurement ?? ''));
  a.pluie_recit = rainNarrative(metric('pluie_jour'), metric('pluie_semaine'), metric('pluie_mois'));
  a.sous_titre = subtitle(a, hourly);
  a.phrase_ressenti = apparentPhrase(a);
  if (!config.temperature_entity) a.phrase_ressenti = String(a.phrase_ressenti).replace(/qu’au thermomètre/g, 'que la température du bulletin').replace(/au thermomètre/g, 'à la température du bulletin');
  return { entity_id: '__niak_model', state: temperature === undefined ? 'unavailable' : String(a.ressenti), attributes: a };
}

export function rainNarrative(day?: number, week?: number, month?: number): string {
  if (day === undefined || month === undefined || day < 0 || month < 0) return '';
  if (month < .15) return 'pas une goutte ce mois-ci';
  if (Math.abs(month - day) < .15) return 'tout ce qui est tombé ce mois-ci est tombé aujourd’hui';
  if (week !== undefined && week > 0 && Math.abs(month - week) < .15) return 'toute la pluie du mois est tombée cette semaine';
  if (day >= .15 && month > 0 && day / month >= .5) return 'aujourd’hui pèse plus de la moitié du mois';
  if (week !== undefined && week < .15) return 'rien cette semaine';
  return '';
}
function subtitle(a: Record<string, any>, hourly: WeatherForecast[]): string {
  const rate = fr(finite(a.pluie_taux), a.pluie_taux >= 10 ? 0 : 1), res = fr(finite(a.ressenti));
  if (a.alerte === 'orage') return 'orage annoncé dans les heures qui viennent';
  if (a.alerte === 'rafales') return `rafales à ${fr(finite(a.rafales), 0)} km/h — attention à ce qui traîne dehors`;
  if (a.alerte === 'canicule') return `${res} °C ressentis — on reste à l’ombre`;
  if (a.alerte === 'gel') return `${res} °C ressentis — gel probable cette nuit`;
  if (a.alerte === 'chaleur') return `${res} °C ressentis — la chaleur commence à peser`;
  if (a.alerte === 'froid') return `${res} °C ressentis — il fait vraiment froid`;
  if (a.alerte === 'uv') return `indice UV ${fr(finite(a.uv), 0)} — ${a.uv_tx}, crème obligatoire`;
  if (a.pluie_force > 0) {
    const end = hourly.slice(0, 12).findIndex(p => (finite(p.precipitation) ?? 0) < .3);
    const total = round(hourly.slice(0, 6).reduce((sum, p) => sum + (finite(p.precipitation) ?? 0), 0));
    const phrase = end === 0 ? 'ça se termine dans l’heure' : end > 0 ? (total >= .3 ? `encore ${fr(total)} mm — ` : '') + `accalmie dans ${end} h`
      : total >= .3 ? `${fr(total)} mm attendues dans les 6 h` : !hourly.length ? 'prévision indisponible' : 'rien de plus dans la prévision';
    return `${rate} mm/h · ${fr(finite(a.pluie_jour))} mm depuis minuit — ${phrase}`;
  }
  if (a.condition === 'fog' && a.cond_source === 'station') return `${fr(finite(a.hr_ext), 0)} % d’humidité — visibilité réduite`;
  if (a.pluie_dans >= 0) return `${fr(a.pluie_mm)} mm de pluie ${a.pluie_dans === 0 ? 'dans l’heure' : 'dans ' + a.pluie_dans + ' h'}`;
  return a.beaufort_tx;
}
function apparentPhrase(a: Record<string, any>): string {
  if (finite(a.t_ext) === undefined) return '';
  if (a.base === 'thermometre' && !a.hum_source) return 'humidité indisponible — elle n’est pas comptée';
  const e = a.ecart_thermometre, abs = fr(Math.abs(e));
  if (Math.abs(e) < .6) return 'le ressenti colle au thermomètre';
  if (e > 0) return `${abs} °C de plus qu’au thermomètre — ` + (a.effet_vent > .3 ? 'même le vent réchauffe, il n’apporte plus rien'
    : a.effet_soleil >= 1.5 ? `le soleil y est pour ${fr(a.effet_soleil)} °C` : 'c’est l’humidité qui pèse');
  const ev = Math.abs(a.effet_vent), ep = Math.abs(a.effet_pluie), en = Math.abs(a.effet_nuit);
  return `${abs} °C de moins qu’au thermomètre — ` + (ep >= ev && ep > .4 ? `l’averse en emporte ${fr(ep)} °C`
    : en > ev && en > .4 ? `le ciel dégagé en emporte ${fr(en)} °C` : `le vent en emporte ${fr(ev)} °C`);
}

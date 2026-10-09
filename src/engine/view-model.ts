// What the card shows, computed once per update from the engine's results.
// The views only read this: they never see sensor ids, model attribute names or units to convert.
import { alertPoints, tickerPoints, type AlertPoint, type Theme, type TickerPoint } from './alerts';
import { atmoField, atmoMetrics, atmoReading, pollenMetrics, pollutantMetrics, usesAtmoPollens, type AtmoReading } from './atmo';
import { buildBulletin, type Bulletin } from './bulletin';
import { currentMetrics, meaningfulComfort, weatherSourceLabel } from './current-measurements';
import { buildCurrentWeather, conditionIcon, conditionLabel, type CurrentWeather } from './current-weather';
import { forecastSlots, type ForecastSlot } from './forecast-slots';
import { chartY, columnStatus, curvePaths, pressureChartSeries, rainDays, windChartSeries, type RainDay } from './history-series';
import { finite, measurement, normaliseForecasts, type History } from './local-model';
import { currentSeason, daylightText, type SeasonInfo } from './season';
import type { StationDerived } from './station-history';
import type { WeatherBrief } from './weather-brief';
import type { AtmoMetric, HassEntity, HomeAssistant, WeatherCardConfig, WeatherForecast } from '../types';
import { dateFormat, numberFormat } from '../intl-cache';

/** A small tinted pill: a value and what it is (« +1,2 °C soleil », « 78 % humidité »). */
export interface Chip { theme: Theme | 'level2' | 'level3'; icon: string; value?: string; label: string; entity?: string }
/** A value posed on a chart: its position in % of the chart box, and its text. */
export interface ChartPill { x: number; y: number; text: string }
/** One curve of a six-hour history chart, drawn in a 100 × 50 box. */
export interface ChartPaths { line: string; area: string }
export interface Stat { label: string; value: string; entity?: string }

export interface ComfortView {
  feels: number; temperature?: number; word: string; humidity: string; gap?: number;
  factors: Chip[]; source: string; entity?: string;
  /** Today's calculation in words, for the « i » bubble: « 22,4 °C (humidex) + 1,2 °C (soleil) = 23,6 °C ressentis ». */
  example: string;
}
export interface RainView {
  source: string; status?: string;
  /** The main figure: a measured total, or the bulletin's state when there is no gauge. */
  value?: number; unit: string; label: string; text?: string; entity: string;
  rate?: number; rateEntity?: string;
  days?: RainDay[]; daysNote: string; empty: string;
  stats: Stat[];
}
export interface WindView {
  source: string; status?: string;
  value?: number; label: string; entity: string; description: string;
  bearing?: number; compass: string; bearingEntity?: string;
  mean: ChartPaths[]; gust: ChartPaths[]; meanLabel: string; pills: ChartPill[]; empty: string;
  stats: Stat[];
}
export interface PressureView {
  source: string; value?: number; entity?: string; description: string;
  trend?: Chip; series: ChartPaths[]; pills: ChartPill[]; empty: string; stats: Stat[];
}
export interface DayForecast { label: string; today: boolean; icon: string; condition: string; low?: number; high?: number; rain: number; wind?: number; bearing?: number; gust?: number }
export interface AirItem { label: string; reading: AtmoReading; concentration?: AtmoReading }
export interface AirPanel {
  kind: 'air' | 'pollen'; tomorrow: boolean; zone: string; primary?: AtmoReading;
  /** A sub-index worse than the global index: it stays visible under it. */
  worse?: AirItem; details: AirItem[]; updated: string; stale: boolean;
}
export interface SeasonView { info: SeasonInfo; news?: string; tip: string }

export interface WeatherView {
  location: string; dateLabel: string; provider: string; forecastSource: string;
  now: CurrentWeather & { trend?: number; darkSky: boolean };
  season: SeasonView;
  alerts: AlertPoint[]; points: TickerPoint[]; brief?: WeatherBrief;
  bulletin?: Bulletin;
  comfort?: ComfortView; rain?: RainView; wind?: WindView; pressure?: PressureView; extras: Chip[];
  hours: ForecastSlot[]; days: DayForecast[];
  air: { today: AirPanel[]; tomorrow: AirPanel[] };
}

export interface ViewInput {
  hass: HomeAssistant; config: WeatherCardConfig; model: HassEntity; brief?: WeatherBrief;
  hourly: WeatherForecast[]; daily: WeatherForecast[]; history: History; rainHistory: History; derived?: StationDerived; now: Date;
}

const available = (e?: HassEntity) => !!e && !['unavailable', 'unknown'].includes(e.state);
const fr = (v: number, d = 1, min = 0) => numberFormat('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: min }).format(v);
const signed = (v: number, d = 1) => `${v > 0 ? '+' : '−'}${fr(Math.abs(v), d, d)}`;
const cap = (t: string) => t ? t[0].toUpperCase() + t.slice(1) : t;
const ROSE = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
export const rose = (deg: number) => ROSE[Math.round(((deg % 360 + 360) % 360) / 22.5) % 16];
const DARK_SKIES = ['lightning', 'lightning-rainy', 'pouring'];

/** The town from a weather entity's name: « Météo-France forecast for city Auriol - Provence-Alpes-Côte d'Azur (13) - FR Auriol » → « Auriol ». */
export function placeName(name: string): string {
  const city = name.match(/for city\s+(.+?)\s+-\s/i)?.[1];
  if (city) return city;
  return name.length > 30 && name.includes(' - ') ? name.split(' - ')[0] : name;
}

export function buildView(input: ViewInput): WeatherView {
  const { hass, config, model, brief, now } = input;
  const weather = hass.states[config.weather_entity], a = available(model) ? model.attributes : {};
  const current = buildCurrentWeather(hass, config, model);
  const windUnit = String(weather?.attributes.wind_speed_unit ?? 'km/h');
  const date = dateFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: hass.config?.time_zone }).format(now);
  const alerts = alertPoints(brief), shown = new Set(alerts.map(x => x.source));
  const trend = finite(a.tend_temp);
  return {
    location: config.location ?? placeName(String(weather?.attributes.friendly_name ?? '')),
    dateLabel: cap(date), provider: weatherSourceLabel(hass, config),
    forecastSource: config.forecast_source ?? (/france/i.test(String(weather?.attributes.attribution)) ? 'Météo-France' : 'Prévisions météo'),
    now: { ...current, trend: trend !== undefined && Math.abs(trend) >= .1 ? trend : undefined, darkSky: DARK_SKIES.includes(current.condition) },
    season: seasonView(currentSeason(hass, config, now)),
    alerts, points: tickerPoints(brief).filter(p => !shown.has(p.text)), brief,
    bulletin: config.show_bulletin === false ? undefined : buildBulletin(input.hourly, now, hass.config?.time_zone, windUnit),
    comfort: comfortView(hass, config, model),
    ...measures(input),
    extras: extras(hass, config, model),
    hours: forecastSlots(input.hourly, now, hass.config?.time_zone, finite(a.lever), finite(a.coucher), windUnit),
    days: days(input.hourly, input.daily, now, hass.config?.time_zone, windUnit),
    air: { today: air(hass, config, now, false), tomorrow: config.show_atmo_tomorrow === false ? [] : air(hass, config, now, true) },
  };
}

function seasonView(info: SeasonInfo): SeasonView {
  // Announced only during the first week of a new season, then the sky alone carries it.
  const news = info.daysIn !== undefined && info.daysIn < 7
    ? { spring: 'C’est le printemps', summer: 'C’est l’été', autumn: 'C’est l’automne', winter: 'C’est l’hiver' }[info.season] : undefined;
  const since = info.start ? dateFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, info.start.month - 1, info.start.day))) : '';
  const daylight = daylightText(info);
  return { info, news, tip: `${info.label}${since ? ` depuis le ${since}` : ''}${daylight ? ` · ${daylight}` : ''}` };
}

function comfortView(hass: HomeAssistant, config: WeatherCardConfig, model: HassEntity): ComfortView | undefined {
  if (!meaningfulComfort(hass, config, model)) return;
  const a = model.attributes, feels = finite(a.ressenti)!, temperature = finite(a.t_ext);
  const sources = (a.sources ?? {}) as Record<string, string>;
  const provider = weatherSourceLabel(hass, config);
  const source = !config.temperature_entity ? provider : a.hum_source === 'bulletin' ? `Station locale · humidité ${provider}` : 'Station locale';
  const humidex = a.base === 'humidex' ? finite(a.humidex) : undefined;
  const terms: Array<[number | undefined, Theme, string, string, string | undefined]> = [
    [humidex !== undefined && temperature !== undefined ? humidex - temperature : undefined, 'rain', 'mdi:water-percent', 'humidité', sources.humidex],
    [finite(a.effet_vent), 'wind', 'mdi:weather-windy', 'vent', sources.vent],
    [finite(a.effet_soleil), 'level1', 'mdi:white-balance-sunny', 'soleil', sources.solaire],
    [finite(a.effet_pluie), 'rain', 'mdi:weather-pouring', 'pluie', sources.pluie_taux],
    [finite(a.effet_nuit), 'cold', 'mdi:weather-night', 'ciel clair', sources.meteo],
  ];
  const significant = terms.filter(([v]) => v !== undefined && Math.abs(v) >= .1);
  const factors = significant.map(([v, theme, icon, label, entity]) => ({ theme, icon, value: `${signed(v!)} °C`, label, entity }));
  const base = humidex ?? temperature;
  const example = base === undefined ? '' : `${fr(base, 1, 1)} °C (${humidex !== undefined ? 'humidex' : 'thermomètre'})`
    + significant.filter(([, , , label]) => label !== 'humidité').map(([v, , , label]) => ` ${v! > 0 ? '+' : '−'} ${fr(Math.abs(v!), 1, 1)} °C (${label})`).join('')
    + ` = ${fr(feels, 1, 1)} °C ressentis`;
  return { feels, temperature, word: String(a.confort ?? ''), humidity: String(a.humidite_tx ?? ''),
    gap: temperature === undefined ? undefined : feels - temperature, factors, source, entity: sources.t_ext, example };
}

function measures(input: ViewInput): Pick<WeatherView, 'rain' | 'wind' | 'pressure'> {
  const { hass, config, model, history, rainHistory, derived, now } = input;
  const metrics = currentMetrics(hass, config, model, input.hourly, now);
  const read = (id: string | undefined, kind: string) => {
    const e = hass.states[id ?? ''], v = available(e) ? measurement(e!.state, e!.attributes.unit_of_measurement, kind) : undefined;
    return v !== undefined && v >= 0 ? v : undefined;
  };
  const status = columnStatus(available(model) ? model : undefined);
  const sourceOf = (m?: { source: string; fallback?: boolean }) => m ? `${m.source}${m.fallback ? ' · repli' : ''}` : 'Station locale';
  const result: Pick<WeatherView, 'rain' | 'wind' | 'pressure'> = {};

  const rainMetric = metrics.find(m => m.key === 'rain');
  if (rainMetric || config.rain_total_entity || config.rain_24h_entity || config.daily_rain_entity || config.weekly_rain_entity || config.monthly_rain_entity || config.yearly_rain_entity) {
    const recent = read(config.rain_24h_entity, 'rain'), today = read(config.daily_rain_entity, 'rain');
    const computed = config.rain_24h_entity === undefined && config.daily_rain_entity === undefined ? derived?.rain.recent : undefined;
    const value = recent ?? today ?? computed?.value, measured = value !== undefined;
    const counter = config.daily_rain_entity === undefined && !!derived && !!config.rain_total_entity;
    const rows = rainHistory[config.daily_rain_entity ?? ''], dailyEntity = hass.states[config.daily_rain_entity ?? ''];
    const days = counter ? derived!.days : rainDays(rows?.length ? [...rows, { s: available(dailyEntity) ? dailyEntity!.state : 'unavailable', lu: now.getTime() / 1000 }] : [],
      dailyEntity?.attributes.unit_of_measurement, now, hass.config?.time_zone);
    const stats: Stat[] = [];
    (['week', 'month', 'year'] as const).forEach((key, i) => {
      const field = (['weekly_rain_entity', 'monthly_rain_entity', 'yearly_rain_entity'] as const)[i], label = ['Semaine', 'Mois', 'Année'][i];
      const total = config[field] === undefined && config.rain_total_entity ? derived?.rain[key] : undefined;
      if (config[field]) { const v = read(config[field], 'rain'); stats.push({ label, value: v === undefined ? '—' : `${fr(v)} mm`, entity: config[field] }); }
      // A partial total is « at least » that much: the sign says it, the label stays short.
      else if (total?.value !== undefined) stats.push({ label, value: `${total.partial ? '≥ ' : ''}${fr(total.value)} mm`, entity: config.rain_total_entity });
    });
    result.rain = {
      source: computed?.value !== undefined ? 'Station locale · historique' : measured ? 'Station locale' : sourceOf(rainMetric),
      status: status.rain,
      value: measured ? value : rainMetric?.text ? undefined : rainMetric?.value, unit: measured || !rainMetric ? 'mm' : rainMetric.unit,
      label: recent !== undefined || computed?.value !== undefined ? `Ces dernières 24 h${computed?.partial ? ' · cumul partiel' : ''}` : today !== undefined ? 'Depuis minuit'
        : !measured && rainMetric ? rainMetric.description : config.rain_24h_entity ? 'Ces dernières 24 h' : 'Depuis minuit',
      text: measured ? undefined : rainMetric?.text,
      entity: (measured ? recent !== undefined ? config.rain_24h_entity : config.daily_rain_entity ?? config.rain_24h_entity ?? config.rain_total_entity : rainMetric?.entity) ?? config.weather_entity,
      rate: config.rain_rate_entity ? read(config.rain_rate_entity, 'rain') : undefined, rateEntity: config.rain_rate_entity,
      days: days.some(d => d.value !== undefined) ? days : undefined,
      daysNote: `${counter ? 'Calculé depuis le compteur total' : 'Maxima enregistrés'}${days.some(d => d.partial) ? ' · ≥ historique partiel' : ''}`,
      empty: config.daily_rain_entity || counter ? 'Historique de pluie indisponible' : 'Ajoutez le cumul depuis minuit pour afficher l’historique',
      stats,
    };
  }

  const windMetric = metrics.find(m => m.key === 'wind');
  if (windMetric || config.wind_gust_entity || config.wind_speed_entity || config.max_daily_gust_entity) {
    const gustEntity = windMetric?.gust?.value !== undefined ? windMetric.gust.entity : config.wind_gust_entity;
    const gust = windMetric?.gust?.value ?? read(config.wind_gust_entity, 'wind');
    const windEntity = windMetric?.value !== undefined ? windMetric.entity : config.wind_speed_entity || config.wind_gust_entity || windMetric?.entity;
    const gustOnly = !config.wind_speed_entity && windMetric?.value === undefined && !!config.wind_gust_entity;
    const value = windMetric?.value ?? read(windEntity, 'wind');
    const computedMax = config.max_daily_gust_entity === undefined ? derived?.gustMax : undefined;
    const maximum = read(config.max_daily_gust_entity, 'wind') ?? computedMax?.value;
    const mean = windChartSeries(history[windEntity ?? ''], hass.states[windEntity ?? '']?.attributes.unit_of_measurement, now, value, gustOnly ? 'peak' : 'mean');
    const gusts = gustEntity && !gustOnly ? windChartSeries(history[gustEntity], hass.states[gustEntity]?.attributes.unit_of_measurement, now, gust, 'peak') : [];
    const top = Math.max(20, Math.ceil(Math.max(...[...mean, ...gusts].map(p => p.v ?? 0)) / 10) * 10);
    const bearing = windMetric?.bearing;
    const stats: Stat[] = [];
    if (gust !== undefined && !gustOnly) stats.push({ label: 'Rafales', value: `${fr(gust, 0)} km/h`, entity: gustEntity });
    if (bearing !== undefined) stats.push({ label: 'Direction', value: `${rose(bearing)} · ${fr((bearing % 360 + 360) % 360, 0)}°`, entity: windMetric?.bearingEntity });
    if (maximum !== undefined) stats.push({ label: 'Max. du jour', value: `${computedMax?.partial ? '≥ ' : ''}${fr(maximum, 0)} km/h`, entity: config.max_daily_gust_entity ?? config.wind_gust_entity });
    result.wind = {
      source: windMetric && windEntity === windMetric.entity ? sourceOf(windMetric) : 'Station locale', status: status.wind,
      value, label: gustOnly ? 'Rafales' : 'Vent moyen', entity: windEntity ?? config.weather_entity,
      description: String(model.attributes.beaufort_tx || ''),
      bearing, compass: bearing === undefined ? 'Direction indisponible' : `Vent ${String(model.attributes.vent_nom || `du ${rose(bearing)}`)}`, bearingEntity: windMetric?.bearingEntity,
      mean: curvePaths(mean, top, now), gust: curvePaths(gusts, top, now), meanLabel: gustOnly ? 'Rafales' : 'Vent moyen',
      pills: extremePills(mean, now, v => chartY(v, top), v => fr(v, 0)), empty: 'Historique du vent indisponible ou insuffisant',
      stats,
    };
  }

  const pressureMetric = metrics.find(m => m.key === 'pressure');
  if (pressureMetric || config.pressure_entity) {
    const value = pressureMetric?.value ?? read(config.pressure_entity, 'pressure'), entity = pressureMetric?.entity ?? config.pressure_entity;
    const series = pressureChartSeries(history[entity ?? ''], hass.states[entity ?? '']?.attributes.unit_of_measurement, now, value);
    const values = series.flatMap(p => p.v === undefined ? [] : [p.v]);
    const low = values.length ? Math.floor(Math.min(...values)) - 1 : 0, top = values.length ? Math.ceil(Math.max(...values)) + 1 : 2;
    const baro = (model.attributes.baro ?? {}) as { tx?: string; d?: number; f?: number };
    const change = finite(baro.d), local = pressureMetric?.source === 'Station locale';
    const first = series.find(p => p.v !== undefined);
    result.pressure = {
      source: sourceOf(pressureMetric), value, entity,
      description: local || !pressureMetric ? baro.tx || 'Mesurée chez vous' : 'Pression du bulletin',
      trend: change === undefined || !local ? undefined : pressureTrend(change, baro.f && baro.f < 150 ? `${baro.f} min` : '3 h'),
      series: curvePaths(series, top, now, low), pills: extremePills(series, now, v => chartY(v, top, low), v => fr(v, 0)),
      empty: 'Historique de pression indisponible ou insuffisant',
      stats: values.length > 1 ? [
        ...(first && first.t <= now.getTime() - 5 * 3600_000 ? [{ label: 'Il y a 6 h', value: `${fr(first.v!, 0)} hPa` }] : []),
        { label: 'Min.', value: `${fr(Math.min(...values), 0)} hPa` }, { label: 'Max.', value: `${fr(Math.max(...values), 0)} hPa` }] : [],
    };
  }
  return result;
}

/** « +1,3 hPa en 3 h », or « stable sur 3 h » when the pressure does not move. */
function pressureTrend(change: number, span: string): Chip {
  if (Math.abs(change) < .05) return { theme: 'pressure', icon: 'mdi:trending-neutral', label: `stable sur ${span}` };
  return { theme: 'pressure', icon: change > 0 ? 'mdi:trending-up' : 'mdi:trending-down', value: `${signed(change)} hPa`, label: `en ${span}` };
}

/** The highest and lowest points of a curve, as pills on the chart; one pill when the curve is flat. */
function extremePills(series: Array<{ t: number; v?: number }>, now: Date, y: (v: number) => number, text: (v: number) => string): ChartPill[] {
  const valid = series.filter(p => p.v !== undefined);
  if (valid.length < 2) return [];
  const hi = valid.reduce((a, b) => b.v! > a.v! ? b : a), lo = valid.reduce((a, b) => b.v! < a.v! ? b : a);
  const x = (t: number) => Math.min(92, Math.max(8, (t - (now.getTime() - 6 * 3600_000)) / 21600_000 * 100));
  const pill = (p: { t: number; v?: number }) => ({ x: x(p.t), y: y(p.v!) / 50 * 100, text: text(p.v!) });
  return text(hi.v!) === text(lo.v!) ? [pill(hi)] : [pill(hi), pill(lo)];
}

function extras(hass: HomeAssistant, config: WeatherCardConfig, model: HassEntity): Chip[] {
  if (!available(model)) return [];
  const a = model.attributes, sources = (a.sources ?? {}) as Record<string, string>, out: Chip[] = [];
  const v = (key: string) => finite(a[key]);
  const uv = v('uv'), lux = v('lux'), solar = v('solaire'), humidity = v('hr_ext'), dew = v('rosee');
  if (solar !== undefined) out.push({ theme: 'level1', icon: 'mdi:solar-power-variant-outline', value: `${fr(solar, 0)} W/m²`, label: 'soleil', entity: sources.solaire });
  if (uv !== undefined) out.push({ theme: uv >= 8 ? 'level3' : uv >= 6 ? 'level2' : 'level1', icon: 'mdi:sun-wireless-outline', value: fr(uv, 0), label: `UV ${a.uv_tx ?? ''}`.trim(), entity: sources.uv });
  if (lux !== undefined) out.push({ theme: 'level1', icon: 'mdi:brightness-5', value: lux >= 1000 ? `${fr(lux / 1000, 1)} k` : fr(lux, 0), label: 'lux', entity: sources.lux });
  if (humidity !== undefined) out.push({ theme: 'rain', icon: 'mdi:water-percent', value: `${fr(humidity, 0)} %`, label: 'humidité', entity: sources.hr_ext });
  if (dew !== undefined) out.push({ theme: 'cold', icon: 'mdi:thermometer-water', value: `${fr(dew, 1, 1)} °C`, label: dew >= 20 ? 'rosée · très lourd' : dew >= 18 ? 'rosée · lourd' : 'rosée', entity: sources.rosee });
  // Polleninformation sensors (legacy source): only the species that are present.
  if (!usesAtmoPollens(config) && config.pollen_source !== 'none') for (const p of config.pollens ?? []) {
    const e = hass.states[p.id]; if (!available(e)) continue;
    const raw = String(e!.state).toLowerCase().trim();
    const words: Record<string, number> = { none: 0, aucun: 0, low: 1, faible: 1, moderate: 2, 'modéré': 2, modere: 2, high: 3, 'élevé': 3, eleve: 3, very_high: 4, 'très élevé': 4, 'tres eleve': 4 };
    const level = words[raw] ?? (Number.isFinite(Number(raw)) ? Math.max(0, Math.min(4, Math.round(Number(raw)))) : 0);
    if (level > 0) out.push({ theme: level >= 4 ? 'level3' : level >= 3 ? 'level2' : 'level1', icon: p.ico || 'mdi:flower-pollen', value: p.nom || p.id, label: ['', 'faible', 'modéré', 'élevé', 'très élevé'][level], entity: p.id });
  }
  return out;
}

function days(hourly: WeatherForecast[], daily: WeatherForecast[], now: Date, timeZone: string | undefined, windUnit: string): DayForecast[] {
  return normaliseForecasts(hourly, daily, now, timeZone, windUnit).jours.map(d => ({
    label: d.e === 0 ? 'Auj.' : cap(d.n.toLowerCase()), today: d.e === 0, icon: conditionIcon(d.c), condition: conditionLabel(d.c),
    low: d.m ?? undefined, high: d.t ?? undefined, rain: d.p, wind: d.v ?? undefined, bearing: d.vb ?? undefined, gust: d.vg ?? undefined,
  }));
}

function air(hass: HomeAssistant, config: WeatherCardConfig, now: Date, tomorrow: boolean): AirPanel[] {
  const read = (metric: AtmoMetric) => atmoReading(hass, config[atmoField(metric, tomorrow)], !['air', ...pollutantMetrics].includes(metric), metric.endsWith('_concentration'), now);
  const withPollen = config.pollen_source !== 'none' && config.pollen_source !== 'legacy';
  const name = (metric: AtmoMetric) => atmoMetrics[metric].label.replace(' — sous-indice', '');
  const pollution = pollutantMetrics.flatMap(metric => { const r = read(metric); return r ? [{ label: name(metric), reading: r }] : []; });
  const species = withPollen ? pollenMetrics.flatMap(metric => {
    const r = read(metric), c = read(`${metric}_concentration` as AtmoMetric);
    return r || c ? [{ label: name(metric), reading: (r ?? c)!, concentration: r ? c : undefined }] : [];
  }) : [];
  const usable = (r?: AtmoReading) => !!r && !r.stale && r.value !== undefined && r.value <= 6;
  const panel = (kind: 'air' | 'pollen', primary: AtmoReading | undefined, details: AirItem[]): AirPanel[] => {
    const readings = [primary, ...details.flatMap(d => [d.reading, d.concentration])].filter((r): r is AtmoReading => !!r);
    if (!readings.length) return [];
    // Keep a concerning sub-index visible when the global index is lower or missing; never rename it as the global index.
    const top = details.filter(d => d.reading.unit === undefined && usable(d.reading)).sort((x, y) => y.reading.value! - x.reading.value!)[0];
    const worse = top && (!usable(primary) || top.reading.value! > primary!.value!) ? top : undefined;
    return [{ kind, tomorrow, primary, worse, details: config.show_atmo_details === false ? [] : details,
      zone: [...new Set(readings.map(r => r.zone).filter(Boolean))].join(' / '),
      updated: [...new Set(readings.map(r => r.updated).filter(Boolean))].join(' / '), stale: readings.some(r => r.stale) }];
  };
  return [...panel('air', read('air'), pollution), ...(withPollen ? panel('pollen', read('pollen'), species) : [])];
}

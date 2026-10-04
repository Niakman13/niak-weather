import type { HassEntity, HomeAssistant, HomeAssistantEntityRegistryEntry as Registry, WeatherCardConfig } from './types';
export interface Device { id: string; name?: string; name_by_user?: string; manufacturer?: string; }
export interface RegistryContext { entities: Registry[]; devices: Device[]; }
export type SensorField = keyof Pick<WeatherCardConfig,
  'temperature_entity' | 'humidity_entity' | 'wind_speed_entity' | 'wind_gust_entity' | 'wind_bearing_entity' | 'rain_rate_entity' |
  'daily_rain_entity' | 'rain_24h_entity' | 'weekly_rain_entity' | 'monthly_rain_entity' | 'yearly_rain_entity' | 'event_rain_entity' |
  'pressure_entity' | 'solar_radiation_entity' | 'dew_point_entity' | 'uv_index_entity' | 'illuminance_entity' | 'max_daily_gust_entity' |
  'temperature_trend_entity' | 'humidex_entity' | 'humidex_perception_entity' | 'thermal_dew_point_entity' | 'heat_index_entity' |
  'absolute_humidity_entity' | 'thermal_perception_entity'>;
export const stationRules: Partial<Record<SensorField, RegExp>> = {
  temperature_entity: /(?:outdoor|outside|exterieur|external).*temp|temp.*(?:outdoor|outside|exterieur|external)/,
  humidity_entity: /(?:outdoor|outside|exterieur|external).*humid|humid.*(?:outdoor|outside|exterieur|external)/,
  wind_speed_entity: /(?:wind.*(?:speed|average|avg)|(?:average|avg).*wind|moyenne.*vent|vent.*moyenne|vitesse.*vent)/,
  wind_gust_entity: /gust|rafale/,
  wind_bearing_entity: /(?:wind.*(?:bearing|direction)|direction.*vent)/,
  rain_rate_entity: /(?:rain.*(?:rate|intensity)|pluie.*(?:taux|intensite))/,
  daily_rain_entity: /(?:daily|today|jour|quotidien).*rain|rain.*(?:daily|today|jour|quotidien)|pluie.*(?:jour|quotidien)/,
  rain_24h_entity: /(?:24h|24_h).*rain|rain.*(?:24h|24_h)|pluie.*24/,
  weekly_rain_entity: /(?:weekly|week|semaine).*rain|rain.*(?:weekly|week|semaine)|pluie.*semaine/,
  monthly_rain_entity: /(?:monthly|month|mois).*rain|rain.*(?:monthly|month|mois)|pluie.*mois/,
  yearly_rain_entity: /(?:yearly|year|annual).*rain|rain.*(?:yearly|year|annual)|pluie.*(?:annuel|annee)/,
  event_rain_entity: /(?:event|episode).*rain|rain.*(?:event|episode)|pluie.*(?:event|episode)/,
  pressure_entity: /pressure|pression/,
  solar_radiation_entity: /solar.*radiation|radiation.*solar|rayonnement/,
  dew_point_entity: /dew_?point|point.*rosee|rosee/,
  uv_index_entity: /uv_index|index_uv|\buv\b/,
  illuminance_entity: /lux|illuminance|luminosite/,
  max_daily_gust_entity: /max.*(?:daily.*gust|gust|rafale)|rafale.*max/,
  temperature_trend_entity: /tendance.*temp.*(?:ext|dehors)|temp.*(?:ext|outdoor).*trend/,
};
const thermalRules: Partial<Record<SensorField, RegExp>> = {
  humidex_entity: /humidex/, humidex_perception_entity: /(?:humidex.*(?:perception|sensation)|(?:perception|sensation).*humidex)/,
  thermal_dew_point_entity: /dew_?point|point.*rosee/, heat_index_entity: /heat_?index|indice.*chaleur/,
  absolute_humidity_entity: /absolute_humidity|humidite_absolue/,
  thermal_perception_entity: /thermal_perception|dew_point_perception|perception_thermique/,
};
export const thermalFields = Object.keys(thermalRules) as SensorField[];
const text = (e: HassEntity, r?: Registry) => `${e.entity_id} ${e.attributes.friendly_name ?? ''} ${r?.unique_id ?? ''} ${r?.translation_key ?? ''} ${r?.original_name ?? ''}`
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isThermal = (e: HassEntity, r?: Registry) => r?.platform === 'thermal_comfort' || /thermal.*comfort/.test(text(e, r));
export async function getRegistry(hass: HomeAssistant): Promise<RegistryContext> {
  const results = await Promise.allSettled([
    hass.callWS<Registry[]>({ type: 'config/entity_registry/list' }), hass.callWS<Device[]>({ type: 'config/device_registry/list' }),
  ]);
  return { entities: results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : Object.entries(hass.entities ?? {}).map(([entity_id, r]) => ({ ...r, entity_id })),
    devices: results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [] };
}
export function candidates(hass: Pick<HomeAssistant, 'states'>, field: SensorField, context?: RegistryContext, config: Partial<WeatherCardConfig> = {}): string[] {
  const thermal = thermalFields.includes(field), rule = (thermal ? thermalRules : stationRules)[field];
  if (!rule) return [];
  const regs = new Map(context?.entities.map(r => [r.entity_id, r]));
  return Object.values(hass.states).filter(e => {
    if (!e.entity_id.startsWith('sensor.')) return false;
    const r = regs.get(e.entity_id), t = text(e, r);
    if (r?.disabled_by || (thermal ? !isThermal(e, r) : isThermal(e, r))) return false;
    const device = thermal ? config.thermal_device_id : config.station_device_id;
    if (device && r?.device_id !== device && field !== 'temperature_trend_entity') return false;
    if (!rule.test(t)) return false;
    if (field === 'temperature_entity' && /dew|rosee|humidex|heat_?index|wind_?chill/.test(t)) return false;
    if (field === 'humidex_entity' && /perception|sensation/.test(t)) return false;
    if (field === 'thermal_dew_point_entity' && /perception/.test(t)) return false;
    if (field === 'wind_gust_entity' && /max|daily/.test(t)) return false;
    if (field === 'daily_rain_entity' && /24h|24_h|max|year/.test(t)) return false;
    return true;
  }).map(e => e.entity_id).sort();
}
function uniqueBest(ids: string[], score: (id: string) => number): string | undefined {
  const ranked = ids.map(id => ({ id, score: score(id) })).sort((a, b) => b.score - a.score);
  if (!ranked.length || (ranked[1] && ranked[1].score === ranked[0].score)) return;
  return ranked[0].id;
}
/** No class-only guesses: a dew point is not a thermometer; cumulative rain periods stay distinct. */
export function detectEcowittStation(hass: Pick<HomeAssistant, 'states'>, context?: RegistryContext, config: Partial<WeatherCardConfig> = {}): Partial<WeatherCardConfig> {
  const selected: Partial<WeatherCardConfig> = {};
  const regs = new Map(context?.entities.map(r => [r.entity_id, r]));
  const isEcowitt = (id: string) => {
    const r = regs.get(id), d = context?.devices.find(d => d.id === r?.device_id);
    return r?.platform === 'ecowitt' || /ecowitt/i.test(d?.manufacturer ?? '') || /(?:ecowitt|gw\d{3,4}|wh\d{2}|ws\d{2})/.test(text(hass.states[id], r));
  };
  const temp = config.temperature_entity || uniqueBest(candidates(hass, 'temperature_entity', context, config), id => isEcowitt(id) ? 100 : 0);
  const stationDevice = config.station_device_id || (temp && regs.get(temp)?.device_id);
  if (stationDevice) selected.station_device_id = stationDevice;
  const prefix = temp?.split('.').pop()?.replace(/_(outdoor|outside|exterieur|external).*$/, '');
  for (const field of Object.keys(stationRules) as SensorField[]) {
    if (config[field] !== undefined) continue;
    const ids = candidates(hass, field, context, { ...config, station_device_id: stationDevice || undefined });
    const best = uniqueBest(ids, id => (isEcowitt(id) ? 100 : 0) + (prefix && id.includes(prefix) ? 40 : 0)
      + (/average|avg|moyenne/.test(text(hass.states[id], regs.get(id))) && /wind_speed|wind_bearing/.test(field) ? 20 : 0)
      + (field === 'pressure_entity' && /relative/.test(text(hass.states[id], regs.get(id))) ? 20 : 0));
    if (best) selected[field] = best;
  }
  const chosen = { ...config, ...selected };
  let thermalDevice = config.thermal_device_id;
  const humidexId = config.humidex_entity || uniqueBest(candidates(hass, 'humidex_entity', context, chosen), id => {
    const e = hass.states[id], targetT = hass.states[chosen.temperature_entity ?? ''], targetH = hass.states[chosen.humidity_entity ?? ''];
    const n = (v: unknown) => v === undefined ? NaN : Number(v);
    return (Math.abs(n(e.attributes.temperature) - n(targetT?.state)) < .15 ? 100 : 0)
      + (Math.abs(n(e.attributes.humidity) - n(targetH?.state)) < 1 ? 100 : 0)
      + (/outdoor|exterieur/.test(text(e, regs.get(id))) ? 20 : 0);
  });
  if (!thermalDevice && humidexId) thermalDevice = regs.get(humidexId)?.device_id;
  if (thermalDevice) selected.thermal_device_id = thermalDevice;
  if (config.humidex_entity === undefined && humidexId) selected.humidex_entity = humidexId;
  for (const field of thermalFields.filter(f => f !== 'humidex_entity')) {
    if (config[field] !== undefined) continue;
    const ids = candidates(hass, field, context, { ...chosen, thermal_device_id: thermalDevice });
    const best = uniqueBest(ids, id => regs.get(id)?.device_id === thermalDevice && thermalDevice ? 100 : 0);
    if (best && (thermalDevice || candidates(hass, 'humidex_entity', context).length <= 1)) selected[field] = best;
  }
  const all = Object.values(hass.states);
  const models = all.filter(e => e.attributes.ressenti !== undefined && e.attributes.effet_vent !== undefined && e.attributes.sources);
  const matching = models.filter(e => {
    const sources = e.attributes.sources as Record<string, string>;
    return sources.t_ext === chosen.temperature_entity && (!config.weather_entity || sources.meteo === config.weather_entity);
  });
  if (config.model_entity === undefined && matching.length === 1) selected.model_entity = matching[0].entity_id;
  const selectedModel = hass.states[config.model_entity ?? selected.model_entity ?? ''];
  const previous = (selectedModel?.attributes.sources as Record<string, string> | undefined)?.prev;
  const forecast = previous ? hass.states[previous] : undefined;
  if (config.forecast_entity === undefined && forecast && Array.isArray(forecast.attributes.heures) && Array.isArray(forecast.attributes.jours)) selected.forecast_entity = previous;
  if (config.air_quality_entity === undefined) {
    const air = all.filter(e => /indice.*qualite.*air/.test(text(e)) && e.attributes.unit_of_measurement === '%');
    if (air.length === 1) selected.air_quality_entity = air[0].entity_id;
  }
  if (config.pollens === undefined) {
    const species = { grasses: ['Graminées', 'mdi:grass'], ragweed: ['Ambroisie', 'mdi:flower-pollen'], mugwort: ['Armoise', 'mdi:flower-pollen'],
      olive: ['Olivier', 'mdi:fruit-cherries'], birch: ['Bouleau', 'mdi:tree-outline'], alder: ['Aulne', 'mdi:tree-outline'] };
    const groups = new Map<string, Array<{ id: string; nom: string; ico: string }>>();
    for (const e of all) {
      const m = e.entity_id.match(/^sensor\.(polleninformation_.+)_(grasses|ragweed|mugwort|olive|birch|alder)$/);
      if (m) { const [nom, ico] = species[m[2] as keyof typeof species]; const group = groups.get(m[1]) ?? []; group.push({ id: e.entity_id, nom, ico }); groups.set(m[1], group); }
    }
    if (groups.size === 1) selected.pollens = [...groups.values()][0];
  }
  return selected;
}

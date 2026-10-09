import type { HassEntity, HomeAssistant, HomeAssistantEntityRegistryEntry as Registry, WeatherCardConfig } from '../types';
import { detectAtmo } from '../engine/atmo';
export interface Device { id: string; name?: string; name_by_user?: string; manufacturer?: string; }
export interface RegistryContext { entities: Registry[]; devices: Device[]; }
export type SensorField = keyof Pick<WeatherCardConfig,
  'temperature_entity' | 'humidity_entity' | 'wind_speed_entity' | 'wind_gust_entity' | 'wind_bearing_entity' | 'rain_rate_entity' |
  'daily_rain_entity' | 'rain_24h_entity' | 'weekly_rain_entity' | 'monthly_rain_entity' | 'yearly_rain_entity' | 'event_rain_entity' |
  'pressure_entity' | 'solar_radiation_entity' | 'dew_point_entity' | 'uv_index_entity' | 'illuminance_entity' | 'max_daily_gust_entity' |
  'temperature_trend_entity' | 'rain_total_entity'>;
export const stationRules: Partial<Record<SensorField, RegExp>> = {
  temperature_entity: /(?:outdoor|outside|exterieur|external).*temp|temp.*(?:outdoor|outside|exterieur|external)|(?:ecowitt|ws\d{2}|station.*meteo).*temp/,
  humidity_entity: /(?:outdoor|outside|exterieur|external).*humid|humid.*(?:outdoor|outside|exterieur|external)|humidity|humidite/,
  wind_speed_entity: /(?:wind.*(?:speed|average|avg)|(?:average|avg).*wind|moyenne.*vent|vent.*moyenne|vitesse.*vent)/,
  wind_gust_entity: /gust|rafale/,
  wind_bearing_entity: /(?:wind.*(?:bearing|direction)|direction.*vent)/,
  rain_rate_entity: /(?:rain.*(?:rate|intensity)|pluie.*(?:taux|intensite))/,
  rain_total_entity: /precipitation|total.*rain|rain.*total|cumul.*pluie/,
  daily_rain_entity: /(?:daily|today|jour|quotidien).*rain|rain.*(?:daily|today|jour|quotidien)|pluie.*(?:jour|quotidien)/,
  rain_24h_entity: /(?:24h|24_h).*(?:rain|precip)|(?:rain|precip).*(?:24h|24_h)|pluie.*24|precipitation.*24/,
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
export const sensorText = (e: HassEntity, r?: Registry) => `${e.entity_id} ${e.attributes.friendly_name ?? ''} ${r?.unique_id ?? ''} ${r?.translation_key ?? ''} ${r?.original_name ?? ''}`
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const text=sensorText;
/** Function exclusions apply to automatic and manual choices alike. */
export function functionMatches(e:HassEntity,field:SensorField,r?:Registry):boolean {
  const t=text(e,r),unit=String(e.attributes.unit_of_measurement??'').toLowerCase().replace(/\s/g,''),cls=e.attributes.device_class;
  const physical:Partial<Record<SensorField,[string[],RegExp]>>={
    temperature_entity:[['temperature'],/^(°?[cf]|k)$/],dew_point_entity:[['temperature'],/^(°?[cf]|k)$/],
    humidity_entity:[['humidity'],/^%$/],pressure_entity:[['pressure','atmospheric_pressure'],/^(hpa|pa|kpa|mbar|inhg|mmhg)$/],
    wind_speed_entity:[['wind_speed'],/^(km\/h|m\/s|mph|kn|kt|kts|knots?)$/],wind_gust_entity:[['wind_speed'],/^(km\/h|m\/s|mph|kn|kt|kts|knots?)$/],
    max_daily_gust_entity:[['wind_speed'],/^(km\/h|m\/s|mph|kn|kt|kts|knots?)$/],wind_bearing_entity:[['wind_direction'],/^(°|deg|degrees?)$/],
    illuminance_entity:[['illuminance'],/^(lx|lux)$/],solar_radiation_entity:[['irradiance'],/^k?w\/(m²|m2)$/],
    rain_rate_entity:[['precipitation_intensity'],/^(mm|in|inch)\/h$/],
    temperature_trend_entity:[['temperature'],/^(°?[cf])\/h$/],
  };
  const measure=physical[field];
  if(measure&&((cls&&!measure[0].includes(String(cls)))||(unit&&!measure[1].test(unit))))return false;
  if(/^(daily_rain|rain_24h|weekly_rain|monthly_rain|yearly_rain|event_rain|rain_total)_entity$/.test(field)&&((cls&&cls!=='precipitation')||(unit&&!/^(mm|in|inch)$/.test(unit))))return false;
  if(field==='illuminance_entity'&&/\braw\b|_raw|brut/.test(t))return false;
  if(field==='temperature_entity'&&/dew|rosee|humidex|heat_?index|wind_?chill|apparent|ressenti|indoor|interieur|trend|tendance/.test(t))return false;
  if(field==='humidity_entity'&&/humidex|absolute|absolue|indoor|interieur|heat.?stress|battery|batterie/.test(t))return false;
  if(field==='wind_speed_entity'&&/direction|bearing|gust|rafale|max/.test(t))return false;
  if(field==='wind_gust_entity'&&(/direction|bearing|max|daily/.test(t)||!stationRules.wind_gust_entity!.test(t)))return false;
  if(field==='max_daily_gust_entity'&&!stationRules.max_daily_gust_entity!.test(t))return false;
  if(field==='pressure_entity'&&/trend|tendance/.test(t))return false;
  if(field==='dew_point_entity'&&!stationRules.dew_point_entity!.test(t))return false;
  if(field==='temperature_trend_entity'&&!/°?[cf]\/h/.test(unit)&&!stationRules.temperature_trend_entity!.test(t))return false;
  if(field==='rain_total_entity')return e.attributes.state_class==='total_increasing'&&!/24.?h|daily|today|jour|week|semaine|month|mois|year|annee|event|episode|rate|intensite/.test(t);
  if(/^(daily_rain|rain_24h|weekly_rain|monthly_rain|yearly_rain|event_rain)_entity$/.test(field))return stationRules[field]!.test(t)&&(field!=='daily_rain_entity'||!/24.?h|week|month|year|semaine|mois|annee/.test(t));
  if(field==='wind_speed_entity'||field==='wind_gust_entity')return !unit||/^(km\/h|m\/s|mph|kn|kt|kts|knots?)$/.test(unit);
  if(field==='illuminance_entity')return (!cls||cls==='illuminance')&&(!unit||/^(lx|lux)$/.test(unit));
  return true;
}
// Thermal Comfort outputs (humidex, dew point…) are never taken for station sensors.
const isThermal = (e: HassEntity, r?: Registry) => r?.platform === 'thermal_comfort' || /thermal.*comfort/.test(text(e, r));
export async function getRegistry(hass: HomeAssistant): Promise<RegistryContext> {
  const results = await Promise.allSettled([
    hass.callWS<Registry[]>({ type: 'config/entity_registry/list' }), hass.callWS<Device[]>({ type: 'config/device_registry/list' }),
  ]);
  return { entities: results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : Object.entries(hass.entities ?? {}).map(([entity_id, r]) => ({ ...r, entity_id })),
    devices: results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [] };
}
export function candidates(hass: Pick<HomeAssistant, 'states'>, field: SensorField, context?: RegistryContext, config: Partial<WeatherCardConfig> = {}): string[] {
  const rule = stationRules[field];
  if (!rule) return [];
  const regs = new Map(context?.entities.map(r => [r.entity_id, r]));
  return Object.values(hass.states).filter(e => {
    if (!e.entity_id.startsWith('sensor.')) return false;
    const r = regs.get(e.entity_id), t = text(e, r);
    if (r?.disabled_by || isThermal(e, r)) return false;
    const device = config.station_device_id;
    if (device && r?.device_id !== device && field !== 'temperature_trend_entity') return false;
    if (!rule.test(t)) return false;
    if(!functionMatches(e,field,r))return false;
    if (field === 'temperature_entity' && /dew|rosee|humidex|heat_?index|wind_?chill|apparent|ressenti|indoor|interieur|trend|tendance/.test(t)) return false;
    if (field === 'humidity_entity' && /humidex|absolute|absolue|indoor|interieur/.test(t)) return false;
    if (field === 'pressure_entity' && /trend|tendance/.test(t)) return false;
    if (field === 'wind_speed_entity' && /gust|rafale|max/.test(t)) return false;
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
    let ids = candidates(hass, field, context, { ...config, station_device_id: stationDevice || undefined });
    if (field === 'humidity_entity' && !stationDevice) ids = ids.filter(id => isEcowitt(id) || /outdoor|outside|exterieur|external/.test(text(hass.states[id], regs.get(id))));
    const best = uniqueBest(ids, id => (isEcowitt(id) ? 100 : 0) + (prefix && id.includes(prefix) ? 40 : 0)
      + (/average|avg|moyenne/.test(text(hass.states[id], regs.get(id))) && /wind_speed|wind_bearing/.test(field) ? 20 : 0)
      + (field === 'pressure_entity' && /relative/.test(text(hass.states[id], regs.get(id))) ? 20 : 0));
    if (best) selected[field] = best;
  }
  const all = Object.values(hass.states);
  Object.assign(selected, detectAtmo(hass, context, config));
  if (config.pollens === undefined && config.pollen_source === 'legacy') {
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

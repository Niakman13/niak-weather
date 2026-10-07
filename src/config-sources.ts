import { atmoAreas, atmoFields } from './atmo';
import { candidates, detectEcowittStation, functionMatches, stationRules, type RegistryContext, type SensorField } from './station-detection';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from './types';

export type SourceCategory = 'general' | 'weather' | 'station' | 'atmo';
export const categoryFields: Record<SourceCategory, Array<keyof WeatherCardConfig>> = {
  general: [], weather: ['weather_entity', 'vigilance_entity', 'sun_entity', 'sun_elevation_entity', 'season_entity'],
  station: Object.keys(stationRules) as SensorField[], atmo: atmoFields,
};
const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function measurementMatches(e: HassEntity, field: SensorField | 'sun_elevation_entity'): boolean {
  const cls = norm(e.attributes.device_class), unit = norm(e.attributes.unit_of_measurement).replace(/\s/g, '');
  const rules: Partial<Record<typeof field, [string[], RegExp]>> = {
    temperature_entity: [['temperature'], /^(°?[cf]|k)$/], humidity_entity: [['humidity'], /^%$/],
    pressure_entity: [['pressure', 'atmospheric_pressure'], /^(hpa|pa|kpa|mbar|inhg|mmhg)$/],
    wind_speed_entity: [['wind_speed'], /^(km\/h|m\/s|mph|kn|kt|kts|knots?)$/],
    wind_gust_entity: [['wind_speed'], /^(km\/h|m\/s|mph|kn|kt|kts|knots?)$/],
    max_daily_gust_entity: [['wind_speed'], /^(km\/h|m\/s|mph|kn|kt|kts|knots?)$/],
    wind_bearing_entity: [['wind_direction'], /^(°|deg|degrees?)$/],
    rain_rate_entity: [['precipitation_intensity'], /^(mm|in|inch)\/h$/],
    solar_radiation_entity: [['irradiance'], /^(k?w\/(m²|m2))$/],
    illuminance_entity: [['illuminance'], /^(lx|lux)$/],
    uv_index_entity: [[], /^(uv|uvindex|index)$/],
    dew_point_entity: [['temperature'], /^(°?[cf]|k)$/],
    temperature_trend_entity: [[], /^(°?[cf])\/h$/],
    sun_elevation_entity: [[], /^(°|deg|degrees?)$/],
  };
  if (/(daily_rain|rain_24h|weekly_rain|monthly_rain|yearly_rain|event_rain|rain_total)_entity/.test(field)) return cls ? cls === 'precipitation' : /^(mm|in|inch)$/.test(unit);
  const rule = rules[field];
  // An explicit unit/type takes precedence over a misleading entity name.
  if (field === 'uv_index_entity' && !cls && !unit) return /uv_index|index_uv|\buv\b/.test(norm(`${e.entity_id} ${e.attributes.friendly_name}`));
  return rule ? (cls && rule[0].length ? rule[0].includes(cls) : rule[1].test(unit)) : false;
}
export function manualCandidates(hass: Pick<HomeAssistant, 'states'>, field: SensorField, context: RegistryContext, config: Partial<WeatherCardConfig>): string[] {
  const semantic = candidates(hass, field, context, config);
  const regs = new Map(context.entities.map(r => [r.entity_id, r]));
  return Object.values(hass.states).filter(e => {
    if (!e.entity_id.startsWith('sensor.') || regs.get(e.entity_id)?.disabled_by) return false;
    const r = regs.get(e.entity_id);
    if (r?.platform === 'thermal_comfort') return false;
    if(!functionMatches(e,field,r))return false;
    if (config.station_device_id && r?.device_id && r.device_id !== config.station_device_id) return false;
    const typed = e.attributes.device_class || e.attributes.unit_of_measurement;
    return measurementMatches(e, field) || (!typed && semantic.includes(e.entity_id));
  }).map(e => e.entity_id).sort();
}
export function sourceDevices(hass: Pick<HomeAssistant, 'states'>, context: RegistryContext): Array<{value:string;label:string}> {
  const ids = new Set<string>();
  const semantic = new Set(Object.keys(stationRules).flatMap(f => candidates(hass, f as SensorField, context)));
  for (const r of context.entities) {
    const e = hass.states[r.entity_id ?? '']; if (!e || !r.device_id || r.disabled_by) continue;
    if (r.platform !== 'thermal_comfort' && (semantic.has(e.entity_id) || Object.keys(stationRules).some(f => measurementMatches(e, f as SensorField)))) ids.add(r.device_id);
  }
  return [...ids].map(value => {const d = context.devices.find(d => d.id === value); const r = context.entities.find(r => r.device_id === value && hass.states[r.entity_id ?? '']);
    return {value,label:d?.name_by_user || d?.name || String(hass.states[r?.entity_id ?? '']?.attributes.friendly_name || value)};}).sort((a,b)=>a.label.localeCompare(b.label));
}
/** Season sensors: the Season integration, or any sensor whose options are exactly the four seasons. */
export function seasonCandidates(hass: Pick<HomeAssistant,'states'>, context: RegistryContext): string[] {
  return Object.values(hass.states).filter(e=>{const r=context.entities.find(r=>r.entity_id===e.entity_id);
    const options=Array.isArray(e.attributes.options)?[...e.attributes.options].map(String).sort().join(','):'';
    return !r?.disabled_by && e.entity_id.startsWith('sensor.') && (r?.platform==='season'||options==='autumn,spring,summer,winter');}).map(e=>e.entity_id);
}
export function vigilanceCandidates(hass: Pick<HomeAssistant,'states'>, context: RegistryContext): string[] {
  return Object.values(hass.states).filter(e=>{const r=context.entities.find(r=>r.entity_id===e.entity_id);
    return !r?.disabled_by && e.entity_id.startsWith('sensor.') && (r?.platform==='meteo_france'||/meteo.france/.test(norm(e.attributes.attribution)))
      && /weather_alert|vigilance|alerte/.test(norm(`${e.entity_id} ${r?.unique_id} ${r?.translation_key} ${r?.original_name}`));}).map(e=>e.entity_id);
}
export function fillCategory(hass: HomeAssistant, context: RegistryContext, config: WeatherCardConfig, category: SourceCategory, fillEmpty=false): WeatherCardConfig {
  const result = {...config}, search = {...config};
  const fields = categoryFields[category];
  for (const field of fields) {
    const id = search[field];
    // Empty strings are deliberate opt-outs; unavailable states still refer to real entities.
    if (typeof id === 'string' && ((id && !hass.states[id])||(fillEmpty&&id===''))) delete search[field];
  }
  const deviceField = category === 'station' ? 'station_device_id' : undefined;
  if (deviceField && search[deviceField] && !context.entities.some(r=>r.device_id===search[deviceField])) delete search[deviceField];
  if (category === 'atmo' && search.atmo_area && !atmoAreas(hass, context).some(a=>a.value===search.atmo_area)) delete search.atmo_area;
  let detected: Partial<WeatherCardConfig> = {};
  if (category === 'general') detected = {smart_brief:config.smart_brief??true,weather_animations:config.weather_animations??true,weather_animation_quality:config.weather_animation_quality??'standard'};
  else if (category === 'weather') {
    const weather = Object.values(hass.states).filter(e=>e.entity_id.startsWith('weather.'));
    const preferred=weather.filter(e=>context.entities.find(r=>r.entity_id===e.entity_id)?.platform==='meteo_france'||/meteo.france/.test(norm(e.attributes.attribution)));
    const ids=preferred.length===1?preferred:weather;
    if (search.weather_entity===undefined && ids.length===1) detected.weather_entity=ids[0].entity_id;
    const vigilances=vigilanceCandidates(hass,context);
    const weatherId=detected.weather_entity??search.weather_entity, entry=context.entities.find(r=>r.entity_id===weatherId)?.config_entry_id;
    const local=entry?vigilances.filter(id=>context.entities.find(r=>r.entity_id===id)?.config_entry_id===entry):vigilances;
    if (search.vigilance_entity===undefined && local.length===1) detected.vigilance_entity=local[0];
    const suns=Object.keys(hass.states).filter(id=>id.startsWith('sun.'));
    if (search.sun_entity===undefined && suns.length===1) detected.sun_entity=suns[0];
    const seasons=seasonCandidates(hass,context);
    if (search.season_entity===undefined && seasons.length===1) detected.season_entity=seasons[0];
  } else {
    const all=detectEcowittStation(hass,context,search);
    const keys: Array<keyof WeatherCardConfig> = [...fields];
    if (deviceField) keys.push(deviceField);
    if (category === 'atmo') keys.push('atmo_area','pollen_source','pollens');
    for (const field of keys) if (all[field]!==undefined && !(field === deviceField && search[field] === '')) Object.assign(detected,{[field]:all[field]});
    // A chosen generic station can expose renamed sensors via their physical type.
    if (category==='station' && search.station_device_id) for (const field of fields as SensorField[]) {
      if (search[field]!==undefined || detected[field]!==undefined) continue;
      if (!['temperature_entity','humidity_entity','pressure_entity','illuminance_entity','solar_radiation_entity'].includes(field)) continue;
      const ids=manualCandidates(hass,field,context,search).filter(id=>context.entities.find(r=>r.entity_id===id)?.device_id===search.station_device_id
        && !/indoor|interieur|dew|rosee|humidex|apparent|wind.?chill|heat.?index|trend|tendance/.test(norm(`${id} ${hass.states[id].attributes.friendly_name}`)));
      if (ids.length===1) detected[field]=ids[0];
    }
  }
  // Apply only successful replacements; unresolved old references remain visible for repair.
  return {...result,...detected};
}
export function sourceStatus(hass: HomeAssistant, config: WeatherCardConfig, category: SourceCategory): string {
  if (category==='general') return 'Réglages de la carte';
  if (category==='weather' && !config.weather_entity) return 'À configurer · source météo requise';
  const ids=categoryFields[category].map(f=>config[f]).filter((v):v is string=>typeof v==='string'&&!!v);
  const missing=ids.filter(id=>!hass.states[id]).length;
  if (missing) return `${missing} référence${missing>1?'s':''} introuvable${missing>1?'s':''} — à réparer`;
  if (!ids.length) return category==='weather'?'À configurer':'Non utilisée';
  const unavailable=ids.filter(id=>['unavailable','unknown'].includes(hass.states[id].state)).length;
  return unavailable?`${unavailable} entité${unavailable>1?'s':''} momentanément indisponible${unavailable>1?'s':''}`:`Configurée · ${ids.length} entité${ids.length>1?'s':''}`;
}

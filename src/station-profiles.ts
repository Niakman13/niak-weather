import {candidates,detectEcowittStation,functionMatches,sensorText,stationRules,type RegistryContext,type SensorField} from './station-detection';
import type {HomeAssistant,WeatherCardConfig} from './types';
export type StationModel=NonNullable<WeatherCardConfig['station_model']>;
export const stationModelOptions=[{value:'gw2000a',label:'Ecowitt GW2000A'},{value:'ws90',label:'Shelly / Ecowitt WS90 — Zigbee2MQTT'},{value:'manual',label:'Autre station / configuration manuelle'}];
export function selectedStationModel(config:Partial<WeatherCardConfig>):StationModel {
  if(config.station_model)return config.station_model;
  const ids=Object.entries(config).filter(([key,value])=>key.endsWith('_entity')&&typeof value==='string').map(([,value])=>value).join(' ').toLowerCase();
  if(/ws90/.test(ids)&&!/gw2000/.test(ids))return 'ws90';
  if(/gw2000/.test(ids)&&!/ws90/.test(ids))return 'gw2000a';
  return 'manual';
}
export function stationGroups(model:StationModel):Array<{name:string;title:string;fields:SensorField[]}>{
  return [
    {name:'station_temperature',title:'Température et humidité',fields:['temperature_entity','humidity_entity']},
    {name:'station_rain',title:'Pluie',fields:model==='gw2000a'?['rain_rate_entity','daily_rain_entity','rain_24h_entity','weekly_rain_entity','monthly_rain_entity','yearly_rain_entity','event_rain_entity']:model==='ws90'?['rain_rate_entity','rain_total_entity']:['rain_rate_entity','rain_total_entity','daily_rain_entity','rain_24h_entity','weekly_rain_entity','monthly_rain_entity','yearly_rain_entity','event_rain_entity']},
    {name:'station_wind',title:'Vent',fields:model==='ws90'?['wind_speed_entity','wind_gust_entity','wind_bearing_entity']:['wind_speed_entity','wind_gust_entity','wind_bearing_entity','max_daily_gust_entity']},
    {name:'station_sun',title:'Soleil',fields:model==='ws90'?['illuminance_entity','uv_index_entity']:['illuminance_entity','uv_index_entity','solar_radiation_entity']},
    {name:'station_specific',title:'Spécifiques',fields:model==='ws90'?['pressure_entity','dew_point_entity']:['pressure_entity','dew_point_entity','temperature_trend_entity']},
  ];
}
export function modelDevices(hass:Pick<HomeAssistant,'states'>,registry:RegistryContext,model:StationModel):string[]{
  return [...new Set([...registry.devices.map(d=>d.id),...registry.entities.map(r=>r.device_id).filter((id):id is string=>!!id)])].filter(id=>{
    const profile=stationProfile(hass,registry,{station_device_id:id});
    return model==='gw2000a'?profile.startsWith('GW2000'):model==='ws90'?profile.startsWith('WS90'):true;
  });
}
export function stationProfile(hass:Pick<HomeAssistant,'states'>,registry:RegistryContext,config:Partial<WeatherCardConfig>):string {
  if(config.station_device_id==='')return 'Autres capteurs / configuration manuelle';
  const regs=registry.entities.filter(r=>r.device_id===config.station_device_id);
  const device=registry.devices.find(d=>d.id===config.station_device_id);
  const text=[device?.name,device?.name_by_user,device?.manufacturer,...regs.map(r=>hass.states[r.entity_id??'']?sensorText(hass.states[r.entity_id!],r):'')].join(' ').toLowerCase();
  if(/ws90/.test(text))return regs.some(r=>r.platform==='mqtt'||r.platform==='zigbee2mqtt')?'WS90 via MQTT':'WS90';
  if(/gw2000/.test(text))return 'GW2000A / Ecowitt';
  return 'Autres capteurs / configuration manuelle';
}
export function stationReport(hass:Pick<HomeAssistant,'states'>,registry:RegistryContext,config:WeatherCardConfig) {
  const detected=detectEcowittStation(hass,registry,config);
  const fields=(Object.keys(stationRules) as SensorField[]).map(field=>{
    const selected=config[field],ids=candidates(hass,field,registry,config);
    const entity=selected||detected[field];
    const reg=registry.entities.find(r=>r.entity_id===entity);
    const status=entity?(hass.states[entity]&&functionMatches(hass.states[entity],field,reg)?'recognized':'invalid'):ids.length>1?'ambiguous':ids.length===1?'recognized':'absent';
    return {field,status,entity:status==='recognized'?entity||ids[0]:undefined,candidates:ids};
  });
  return {profile:stationProfile(hass,registry,config),fields,recognized:fields.filter(f=>f.status==='recognized').length};
}

import {candidates,detectEcowittStation,functionMatches,sensorText,stationRules,type RegistryContext,type SensorField} from './station-detection';
import type {HomeAssistant,WeatherCardConfig} from './types';
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

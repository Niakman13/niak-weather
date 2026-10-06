import {describe,it,expect} from 'vitest';
import {fillCategory,manualCandidates} from '../src/config-sources';
import type {HomeAssistant,WeatherCardConfig} from '../src/types';
const prefix='sensor.station_meteo_ecowitt_ws90_powered_by_shelly_';
const measurements={temperature:['temperature','°C'],dew_point:['temperature','°C'],apparent_temperature:['temperature','°C'],illuminance:['illuminance','lx'],illuminance_raw:['',''],wind_speed:['wind_speed','km/h'],gust_speed:['wind_speed','km/h'],wind_direction:['','°'],precipitation:['precipitation','mm'],precipitations_24h:['precipitation','mm']} as const;
const states=Object.fromEntries(Object.entries(measurements).map(([name,[device_class,unit_of_measurement]])=>[prefix+name,{entity_id:prefix+name,state:'1',attributes:{device_class,unit_of_measurement,state_class:name==='precipitation'?'total_increasing':'measurement'}}]));
const hass={states} as HomeAssistant;
const registry={entities:Object.keys(states).map(entity_id=>({entity_id,device_id:'station',platform:'mqtt'})),devices:[{id:'station',name:'WS90',manufacturer:'Shelly'}]};
const config:WeatherCardConfig={type:'custom:niak-weather-card',weather_entity:'weather.home',station_device_id:'station'};
describe('Station profiles and function-aware choices',()=>{
  it('prefills calibrated illuminance even with a raw channel',()=>expect(fillCategory(hass,registry,config,'station').illuminance_entity).toBe(prefix+'illuminance'));
  it('restricts real temperature, wind mean and gusts to their function',()=>{
    expect(manualCandidates(hass,'temperature_entity',registry,config)).toEqual([prefix+'temperature']);
    expect(manualCandidates(hass,'wind_speed_entity',registry,config)).toEqual([prefix+'wind_speed']);
    expect(manualCandidates(hass,'wind_gust_entity',registry,config)).toEqual([prefix+'gust_speed']);
  });
  it('does not offer a generic counter as a daily counter',()=>expect(manualCandidates(hass,'daily_rain_entity',registry,config)).toEqual([]));
  it('does not mistake averaged wind direction for speed',()=>{
    const id='sensor.gw2000a_wind_direction_10m_avg';
    expect(fillCategory({states:{[id]:{entity_id:id,state:'180',attributes:{unit_of_measurement:'°'}}}} as HomeAssistant,{entities:[],devices:[]},{...config,station_device_id:undefined},'station').wind_speed_entity).toBeUndefined();
  });
  it('recognizes a WS90 MQTT profile and reports ambiguous fields without choosing',async()=>{
    const profiles=await import('../src/station-profiles');
    const report=profiles.stationReport(hass,registry,config);
    expect(report.profile).toBe('WS90 via MQTT');
    expect(report.fields.find(f=>f.field==='illuminance_entity')).toMatchObject({status:'recognized',entity:prefix+'illuminance'});
    expect(report.fields.find(f=>f.field==='daily_rain_entity')).toMatchObject({status:'absent'});
  });
});

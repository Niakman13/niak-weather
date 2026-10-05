import { describe, expect, it } from 'vitest';
import { fillCategory, manualCandidates, measurementMatches, sourceDevices, sourceStatus } from '../src/config-sources';
import { candidates, type RegistryContext } from '../src/station-detection';
import { renderLocal } from '../src/local-renderer';
import { measurement } from '../src/local-model';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from '../src/types';
const base: WeatherCardConfig = {type:'custom:niak-weather-card',weather_entity:'weather.city'};
const entity = (id:string, state='20', attributes:Record<string,unknown>={}):HassEntity => ({entity_id:id,state,attributes});
const hass = (states:Record<string,HassEntity>) => ({states,language:'fr'} as HomeAssistant);
const empty:RegistryContext = {entities:[],devices:[]};
describe('Source configuration and repairs',()=>{
  it('filters manually by physical measurement, even after a rename',()=>{
    const states={'sensor.custom':entity('sensor.custom','20',{device_class:'temperature',unit_of_measurement:'°C'}),
      'sensor.temp_bad':entity('sensor.temp_bad','60',{device_class:'humidity',unit_of_measurement:'%'}),
      'sensor.lux':entity('sensor.lux','10',{device_class:'illuminance',unit_of_measurement:'lx'}),
      'sensor.fahrenheit':entity('sensor.fahrenheit','70',{unit_of_measurement:'°F'})};
    expect(manualCandidates(hass(states),'temperature_entity',empty,base)).toEqual(['sensor.custom','sensor.fahrenheit']);
    expect(manualCandidates(hass(states),'humidity_entity',empty,base)).toEqual(['sensor.temp_bad']);
  });
  it.each([
    ['wind_speed_entity','m/s'],['wind_gust_entity','km/h'],['rain_rate_entity','mm/h'],['daily_rain_entity','mm'],
    ['pressure_entity','hPa'],['solar_radiation_entity','W/m²'],['illuminance_entity','lx'],['wind_bearing_entity','°'],
  ] as const)('recognises %s with %s',(field,unit)=>{
    expect(measurementMatches(entity('sensor.custom','1',{unit_of_measurement:unit}),field)).toBe(true);
    expect(measurementMatches(entity('sensor.custom','1',{unit_of_measurement:'kWh'}),field)).toBe(false);
  });
  it('repairs missing station references without touching other categories',()=>{
    const id='sensor.station_meteo_ws90_temperature';
    const states={[id]:entity(id,'20',{device_class:'temperature'})};
    const context={entities:[{entity_id:id,platform:'mqtt',device_id:'ws90'}],devices:[{id:'ws90',name:'WS90 Zigbee2MQTT'}]};
    const config={...base,temperature_entity:'sensor.deleted',humidex_entity:'sensor.keep',atmo_air_entity:'sensor.atmo_keep'};
    expect(fillCategory(hass(states),context,config,'station')).toMatchObject({temperature_entity:id,humidex_entity:'sensor.keep',atmo_air_entity:'sensor.atmo_keep',station_device_id:'ws90'});
    expect(sourceDevices(hass(states),context)).toEqual([{value:'ws90',label:'WS90 Zigbee2MQTT'}]);
  });
  it('preserves empty fields, valid manual IDs and unavailable entities',()=>{
    const id='sensor.outdoor_temperature',states={[id]:entity(id),'sensor.manual':entity('sensor.manual','unavailable')};
    for(const selected of ['', 'sensor.manual']) expect(fillCategory(hass(states),empty,{...base,temperature_entity:selected},'station').temperature_entity).toBe(selected);
    expect(sourceStatus(hass(states),{...base,temperature_entity:'sensor.manual'},'station')).toContain('momentanément indisponible');
    expect(sourceStatus(hass(states),{...base,temperature_entity:'sensor.deleted'},'station')).toContain('à réparer');
  });
  it('does not guess an ambiguous missing reference',()=>{
    const states={'sensor.a_outdoor_temperature':entity('sensor.a_outdoor_temperature'),'sensor.b_outdoor_temperature':entity('sensor.b_outdoor_temperature')};
    expect(fillCategory(hass(states),empty,{...base,temperature_entity:'sensor.deleted'},'station').temperature_entity).toBe('sensor.deleted');
  });
  it('does not auto-associate a room humidity or an explicitly indoor humidex',()=>{
    const states={'sensor.salon_humidity':entity('sensor.salon_humidity'),'sensor.inside_humidex':entity('sensor.inside_humidex')};
    const context={entities:[{entity_id:'sensor.inside_humidex',platform:'thermal_comfort'}],devices:[]};
    expect(fillCategory(hass(states),context,base,'station').humidity_entity).toBeUndefined();
    expect(fillCategory(hass(states),context,base,'thermal').humidex_entity).toBeUndefined();
  });
  it('retains the explicit manual-device mode during automatic filling',()=>{
    const states={'sensor.outdoor_temperature':entity('sensor.outdoor_temperature')};
    const context={entities:[{entity_id:'sensor.outdoor_temperature',device_id:'outside',platform:'mqtt'}],devices:[]};
    expect(fillCategory(hass(states),context,{...base,station_device_id:''},'station')).toMatchObject({station_device_id:'',temperature_entity:'sensor.outdoor_temperature'});
  });
  it('keeps indoor, apparent and trend sensors out of automatic station choices',()=>{
    const ids=['sensor.ecowitt_indoor_temperature','sensor.ecowitt_apparent_temperature','sensor.ecowitt_pressure_trend','sensor.ecowitt_absolute_humidity'];
    const states=Object.fromEntries(ids.map(id=>[id,entity(id)]));
    for(const field of ['temperature_entity','pressure_entity','humidity_entity'] as const) expect(candidates(hass(states),field)).toEqual([]);
  });
  it('keeps humidex strictly in Thermal Comfort, not MQTT station sensors',()=>{
    const states={'sensor.ws90_humidex':entity('sensor.ws90_humidex'),'sensor.custom':entity('sensor.custom')};
    const context={entities:[{entity_id:'sensor.ws90_humidex',platform:'mqtt'},{entity_id:'sensor.custom',platform:'thermal_comfort',translation_key:'humidex'}],devices:[]};
    expect(manualCandidates(hass(states),'humidex_entity',context,base)).toEqual(['sensor.custom']);
    expect(fillCategory(hass(states),context,base,'thermal').humidex_entity).toBe('sensor.custom');
  });
  it('repairs Atmo after a reinstall using zone, measure and day metadata',()=>{
    const states:Record<string,HassEntity>={},context:RegistryContext={entities:[],devices:[]};
    for(const [id,name] of [['sensor.new_air','Qualité globale'],['sensor.new_next','Qualité globale-J+1'],['sensor.new_pm25','PM25']]){
      states[id]=entity(id,'3',{'Nom de la zone':'Gardanne','Type de zone':'Commune'});
      context.entities.push({entity_id:id,platform:'atmofrance',original_name:name,config_entry_id:'new-entry'});
    }
    const config={...base,location:'Gardanne',atmo_area:'entry:old-entry',atmo_air_entity:'sensor.old_air',atmo_air_tomorrow_entity:'sensor.old_next',atmo_pm25_entity:'',temperature_entity:'sensor.keep'};
    expect(fillCategory(hass(states),context,config,'atmo')).toMatchObject({atmo_area:'zone:commune:gardanne',atmo_air_entity:'sensor.new_air',atmo_air_tomorrow_entity:'sensor.new_next',atmo_pm25_entity:'',temperature_entity:'sensor.keep'});
  });
  it('fills only weather sources and does not require a station',()=>{
    const states={'weather.city':entity('weather.city','sunny'),'sun.sun':entity('sun.sun','above_horizon'),'sensor.outdoor_temperature':entity('sensor.outdoor_temperature')};
    expect(fillCategory(hass(states),empty,{...base,weather_entity:'weather.deleted'},'weather')).toEqual({...base,sun_entity:'sun.sun'});
  });
  it('hides unconfigured station metrics but retains configured unavailable ones',()=>{
    const render=(configured:Partial<WeatherCardConfig>)=>renderLocal({ent:'sensor.model',dashboard:true,adaptive:true,configured},{'sensor.model':{state:'20',attributes:{t_ext:20,ressenti:20}}},{});
    expect(render({}).tuiles.match(/class="me-tu"/g)).toHaveLength(1);
    expect(render({wind_speed_entity:'sensor.unavailable'}).tuiles).toContain('Vent');
    expect(render({}).tuiles).not.toContain('Pression');
  });
  it('converts the additional compatible pressure and temperature-trend units',()=>{
    expect(measurement(760,'mmHg','pressure')).toBeCloseTo(1013.25,1);
    expect(measurement(1.8,'°F/h','temperature_delta')).toBeCloseTo(1);
  });
  it('does not confuse millimetres of distance with rainfall',()=>{
    expect(measurementMatches(entity('sensor.distance','10',{device_class:'distance',unit_of_measurement:'mm'}),'daily_rain_entity')).toBe(false);
    expect(measurementMatches(entity('sensor.trend','1',{device_class:'temperature',unit_of_measurement:'°C/h'}),'temperature_trend_entity')).toBe(true);
  });
  it('preserves automatic filling for the legacy pollen alternative',()=>{
    const states={'sensor.polleninformation_city_grasses':entity('sensor.polleninformation_city_grasses','3')};
    expect(fillCategory(hass(states),empty,{...base,pollen_source:'legacy'},'atmo').pollens?.[0].id).toBe('sensor.polleninformation_city_grasses');
  });
});

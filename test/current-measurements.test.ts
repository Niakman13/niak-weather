import { describe,expect,it } from 'vitest';
import { currentMetrics,meaningfulComfort } from '../src/current-measurements';
import type { HassEntity,HomeAssistant,WeatherCardConfig } from '../src/types';
const e=(id:string,state='20',attributes:Record<string,unknown>={}):HassEntity=>({entity_id:id,state,attributes});
const config:WeatherCardConfig={type:'custom:niak-weather-card',weather_entity:'weather.city'};
const model=e('sensor.model','20',{t_ext:20,ressenti:20});
const h=(extra:Record<string,HassEntity>={}):HomeAssistant=>({language:'fr',locale:{language:'fr'},formatEntityState:e=>e.state,formatEntityName:e=>e.entity_id,callWS:async<T>()=>({} as T),states:{'weather.city':e('weather.city','cloudy',{attribution:'Météo-France',temperature:20,temperature_unit:'°C',wind_speed:12,wind_speed_unit:'km/h',pressure:1012,pressure_unit:'hPa'}),...extra}});
describe('Current measurement cards and source provenance',()=>{
  it('provides the four frames without requiring a station',()=>{
    const metrics=currentMetrics(h(),config,model);
    expect(metrics.map(m=>m.key)).toEqual(['temperature','wind','rain','pressure']);
    expect(metrics.every(m=>m.source==='Météo-France' && m.entity==='weather.city')).toBe(true);
    expect(metrics.find(m=>m.key==='rain')).toMatchObject({text:'Temps sec',value:undefined,unit:''});
  });
  it('never invents quantitative rainfall from the current condition',()=>{
    const metrics=currentMetrics(h({'weather.city':e('weather.city','rainy',{attribution:'Météo-France',temperature:20})}),config,model);
    expect(metrics.find(m=>m.key==='rain')).toMatchObject({text:'Pluie',description:'État annoncé dans le bulletin',value:undefined});
    expect(metrics.some(m=>m.description==='Depuis minuit')).toBe(false);
  });
  it('prefers real local zero values, while preserving provider fallbacks for other frames',()=>{
    const metrics=currentMetrics(h({'sensor.wind':e('sensor.wind','0',{unit_of_measurement:'m/s'}),'sensor.rain':e('sensor.rain','0',{unit_of_measurement:'mm/h'})}),{...config,wind_speed_entity:'sensor.wind',rain_rate_entity:'sensor.rain'},model);
    expect(metrics.find(m=>m.key==='wind')).toMatchObject({value:0,source:'Station locale',entity:'sensor.wind'});
    expect(metrics.find(m=>m.key==='rain')).toMatchObject({value:0,unit:'mm/h',source:'Station locale',entity:'sensor.rain'});
    expect(metrics.find(m=>m.key==='pressure')?.source).toBe('Météo-France');
  });
  it('labels a missing local sensor fallback explicitly and opens the provider',()=>{
    expect(currentMetrics(h({'sensor.temp':e('sensor.temp','unavailable')}),{...config,temperature_entity:'sensor.temp'},model)[0]).toMatchObject({value:20,source:'Météo-France',entity:'weather.city',fallback:true});
  });
  it('does not read stale attributes from an unavailable weather entity',()=>{
    const metrics=currentMetrics(h({'weather.city':e('weather.city','unavailable',{temperature:99,wind_speed:90,pressure:999})}),{...config,temperature_entity:'sensor.missing'},model);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({value:undefined,source:'Station locale',entity:'sensor.missing',fallback:false});
  });
  it('keeps rainfall since midnight separate from rain intensity and forecasts',()=>{
    const metrics=currentMetrics(h({'sensor.total':e('sensor.total','2',{unit_of_measurement:'mm'}),'sensor.rate':e('sensor.rate','0.1',{unit_of_measurement:'in/h'})}),{...config,daily_rain_entity:'sensor.total',rain_rate_entity:'sensor.rate'},model);
    expect(metrics.find(m=>m.key==='rain')).toMatchObject({value:2,unit:'mm',description:'Depuis minuit',source:'Station locale',entity:'sensor.total'});
    expect(metrics.find(m=>m.key==='rain')?.detail).toContain('2,5 mm/h');
  });
  it('labels near-term forecast precipitation instead of treating it as a daily total',()=>{
    const now=new Date('2026-10-05T12:00:00Z');
    const metric=currentMetrics(h(),config,model,[{datetime:'2026-10-05T12:30:00Z',precipitation:1.2},{datetime:'2026-10-05T11:00:00Z',precipitation:99}],now).find(m=>m.key==='rain');
    expect(metric?.detail).toBe('1,2 mm prévus sur le prochain créneau');
    expect(metric?.description).not.toBe('Depuis minuit');
  });
  it('converts provider and local units consistently',()=>{
    const metrics=currentMetrics(h({'weather.city':e('weather.city','cloudy',{temperature:68,temperature_unit:'°F',wind_speed:10,wind_speed_unit:'m/s',pressure:101.2,pressure_unit:'kPa'})}),config,model);
    expect(metrics.find(m=>m.key==='temperature')?.value).toBe(20);
    expect(metrics.find(m=>m.key==='wind')?.value).toBe(36);
    expect(metrics.find(m=>m.key==='pressure')?.value).toBe(1012);
  });
  it('hides comfort with only a weather provider, even if an estimated value exists',()=>{
    expect(meaningfulComfort(h(),config,model)).toBe(false);
  });
  it('keeps comfort with a valid local thermometer or Thermal Comfort humidex',()=>{
    expect(meaningfulComfort(h({'sensor.temp':e('sensor.temp')}),{...config,temperature_entity:'sensor.temp'},model)).toBe(true);
    expect(meaningfulComfort(h({'sensor.humidex':e('sensor.humidex','23')}),{...config,humidex_entity:'sensor.humidex'},model)).toBe(true);
    expect(meaningfulComfort(h({'sensor.humidex':e('sensor.humidex','unavailable')}),{...config,humidex_entity:'sensor.humidex'},model)).toBe(false);
  });
});

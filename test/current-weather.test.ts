import { describe, expect, it } from 'vitest';
import { buildCurrentWeather } from '../src/current-weather';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from '../src/types';

const entity=(id:string,state:string,attributes:Record<string,unknown>={}):HassEntity=>({entity_id:id,state,attributes});
const config:WeatherCardConfig={type:'custom:niak-weather-card',weather_entity:'weather.home'};
const model=entity('sensor.model','21',{t_ext:20,ressenti:22,pluie_taux:0,vent:10,condition:'lightning-rainy',alerte:'thunderstorm'});
const hass=(state='sunny',extra:Record<string,HassEntity>={}):HomeAssistant=>({states:{'weather.home':entity('weather.home',state,{temperature:20,temperature_unit:'°C'}),...extra},
  language:'fr',locale:{language:'fr'},formatEntityState:e=>e.state,formatEntityName:e=>e.entity_id,callWS:async<T>()=>({} as T)});
describe('Current weather, never the future brief',()=>{
  it('does not animate a future storm or infer one from the model alert',()=>{
    expect(buildCurrentWeather(hass(),config,model)).toMatchObject({condition:'sunny',temperature:20,feels:22,source:'Ciel · bulletin météo',phase:'unknown'});
  });
  it.each(['sunny','clear-night','partlycloudy','cloudy','rainy','pouring','lightning','lightning-rainy','snowy','snowy-rainy','hail','fog','windy','windy-variant','exceptional'])('accepts condition %s from weather entity',condition=>{
    expect(buildCurrentWeather(hass(condition),config,model).condition).toBe(condition);
  });
  it('normalises condition aliases',()=>{
    expect(buildCurrentWeather(hass('lightning_rainy'),config,model).condition).toBe('lightning-rainy');
    expect(buildCurrentWeather(hass('clear'),config,model).condition).toBe('sunny');
  });
  it.each(['unknown','unavailable','invented'])('neutral scene for %s without fake zero',state=>{
    const unavailable=entity('sensor.model','unavailable',model.attributes);
    const result=buildCurrentWeather(hass(state),config,unavailable);
    expect(result).toMatchObject({condition:'unknown',label:'Météo indisponible',temperature:state==='invented' ? 20 : undefined,feels:undefined});
  });
  it('uses observed rain with converted units',()=>{
    const h=hass('sunny',{'sensor.rain':entity('sensor.rain','.2',{unit_of_measurement:'in/h'})});
    expect(buildCurrentWeather(h,{...config,rain_rate_entity:'sensor.rain'},model)).toMatchObject({condition:'pouring',source:'Pluie mesurée ici',conditionEntity:'sensor.rain'});
  });
  it('does not replace an unavailable configured rain rate by stale model rain',()=>{
    expect(buildCurrentWeather(hass('sunny',{'sensor.rain':entity('sensor.rain','unavailable')}),{...config,rain_rate_entity:'sensor.rain'},{...model,attributes:{pluie_taux:20}}).condition).toBe('sunny');
  });
  it('does not animate rain when the selected gauge measures zero',()=>{
    const result=buildCurrentWeather(hass('rainy',{'sensor.rain':entity('sensor.rain','0')}),{...config,rain_rate_entity:'sensor.rain'},model);
    expect(result).toMatchObject({condition:'cloudy',label:'Nuageux, sans pluie mesurée',source:'Pas de pluie mesurée · ciel du bulletin'});
  });
  it('keeps snow and hail distinct from rain-gauge readings',()=>{
    for(const c of ['snowy','snowy-rainy','hail']) expect(buildCurrentWeather(hass(c),config,{...model,attributes:{pluie_taux:15}}).condition).toBe(c);
  });
  it('labels storm as a bulletin condition, not measured lightning',()=>{
    expect(buildCurrentWeather(hass('lightning'),config,{...model,attributes:{pluie_taux:1}}).source).toBe('Pluie mesurée · orage du bulletin');
  });
  it('can display measured rain even without a sky bulletin',()=>{
    expect(buildCurrentWeather(hass('unavailable'),config,{...model,attributes:{pluie_taux:1}}).condition).toBe('rainy');
  });
  it('uses the configured thermometer and converts Fahrenheit',()=>{
    expect(buildCurrentWeather(hass('sunny',{'sensor.temp':entity('sensor.temp','68',{unit_of_measurement:'°F'})}),{...config,temperature_entity:'sensor.temp'},model)).toMatchObject({temperature:20,temperatureEntity:'sensor.temp',temperatureSource:'Thermomètre'});
  });
  it('does not fall back silently when configured temperature is missing',()=>{
    expect(buildCurrentWeather(hass(),{...config,temperature_entity:'sensor.missing'},model).temperature).toBeUndefined();
  });
  it('keeps actual zero and negative temperature values',()=>{
    for(const t of [0,-15]) expect(buildCurrentWeather(hass('cloudy',{'weather.home':entity('weather.home','cloudy',{temperature:t})}),config,model).temperature).toBe(t);
  });
  it.each([[20,'day'],[1,'twilight'],[-12,'night']])('sun elevation %s selects %s', (elevation,phase)=>{
    const result=buildCurrentWeather(hass('sunny',{'sun.sun':entity('sun.sun','below_horizon',{elevation})}),config,model);
    expect(result.phase).toBe(phase);expect(result.condition).toBe(phase==='night' ? 'clear-night':'sunny');
  });
  it('uses configured sun elevation, does not invent fixed local sunrise times',()=>{
    expect(buildCurrentWeather(hass('cloudy',{'sensor.elev':entity('sensor.elev','-15')}),{...config,sun_elevation_entity:'sensor.elev'},model).phase).toBe('night');
    expect(buildCurrentWeather(hass('cloudy'),config,model).phase).toBe('unknown');
  });
  it('lets current solar elevation override a lingering clear-night bulletin',()=>{
    expect(buildCurrentWeather(hass('clear-night',{'sun.sun':entity('sun.sun','above_horizon',{elevation:35})}),config,model)).toMatchObject({phase:'day',condition:'sunny'});
  });
  it('converts wind units for animation speed',()=>{
    expect(buildCurrentWeather(hass('windy',{'sensor.wind':entity('sensor.wind','10',{unit_of_measurement:'m/s'})}),{...config,wind_speed_entity:'sensor.wind'},model).wind).toBe(36);
  });
});

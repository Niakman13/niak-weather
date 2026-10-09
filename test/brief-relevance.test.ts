import {describe,it,expect} from 'vitest';
import {buildWeatherBrief} from '../src/engine/weather-brief';
import {briefPresentation,briefSecondarySignals} from '../src/engine/brief-preview';
import type {HomeAssistant,HassEntity,WeatherCardConfig} from '../src/types';
const config:WeatherCardConfig={type:'custom:niak-weather-card',weather_entity:'weather.test',temperature_entity:'sensor.outdoor'};
const hass={states:{},config:{time_zone:'Europe/Paris'}} as unknown as HomeAssistant;
const now=new Date('2026-10-06T08:00:00Z');
const model=(attributes:Record<string,unknown>):HassEntity=>({entity_id:'sensor.model',state:'20',attributes:{t_ext:20,ressenti:20,humidex:20,...attributes}});
describe('Only relevant brief content',()=>{
  it('leaves an ordinary current situation blank',()=>{
    expect(briefPresentation(buildWeatherBrief(hass,config,model({vent:12,pluie_taux:0}),[{hours:1,temperature:21,precipitation:0}],now)).headline).toBeUndefined();
  });
  it('uses the real available maximum, not the final forecast point or a delay',()=>{
    const b=buildWeatherBrief(hass,config,model({}),[{hours:1,temperature:21},{hours:3,temperature:25},{hours:6,temperature:23}],now);
    expect(b.signals.find(s=>s.key==='temperature-future')?.text).toBe('Montée jusqu’à 25 °C dans les 6 h');
  });
  it.each([[24,false],[24.1,true],[15.9,true]])('only explains a comfort gap strictly above 4 degrees: %s', (ressenti,exists)=>{
    const b=buildWeatherBrief(hass,config,model({ressenti}),[],now);
    expect(b.signals.some(s=>s.key==='comfort-gap')).toBe(exists);
    if(exists)expect(b.signals.find(s=>s.key==='comfort-gap')?.text).toContain(ressenti>20?'de plus qu’au thermomètre':'de moins qu’au thermomètre');
  });
  it('keeps an ordinary temperature outlook out when a current concern is present',()=>{
    const b=buildWeatherBrief(hass,config,model({vent:40}),[{hours:5,temperature:25}],now);
    expect(briefSecondarySignals(b).some(s=>s.key==='temperature-future')).toBe(false);
  });
  it('prefers noteworthy rain tomorrow to a mild warming outlook',()=>{
    const b=(buildWeatherBrief as any)(hass,config,model({}),[{hours:5,temperature:25}],now,[{datetime:'2026-10-07T10:00:00Z',precipitation:72}]);
    expect(briefPresentation(b).headline).toBe('Forte pluie demain : 72 mm');
    expect(b.signals.find((s:any)=>s.key==='rain-tomorrow')?.severity).toBe(0);
  });
  it('does not present today, old or small daily rainfall as noteworthy tomorrow',()=>{
    for(const daily of [[{datetime:'2026-10-06T10:00:00Z',precipitation:72}],[{datetime:'2026-10-07T10:00:00Z',precipitation:19.9}],[{datetime:'invalid',precipitation:72}]]){
      expect(buildWeatherBrief(hass,config,model({}),[],now,daily).signals.some(s=>s.key==='rain-tomorrow')).toBe(false);
    }
  });
});

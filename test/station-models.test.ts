import {describe,it,expect} from 'vitest';
import * as profiles from '../src/editor/station-profiles';
describe('Explicit station model setup',()=>{
  it('starts from existing GW2000A entities without requiring a device selection',()=>{
    const resolve=(profiles as any).selectedStationModel;
    expect(typeof resolve).toBe('function');
    expect(resolve({temperature_entity:'sensor.gw2000a_outdoor_temperature'})).toBe('gw2000a');
  });
  it('shows model-specific fields grouped by the physical subject',()=>{
    const groups=(profiles as any).stationGroups;
    expect(typeof groups).toBe('function');
    const gw=groups('gw2000a'),ws=groups('ws90'),manual=groups('manual');
    const fields=(g:any[])=>g.flatMap(s=>s.fields);
    expect(gw.map((g:any)=>g.title)).toEqual(['Température et humidité','Pluie','Vent','Soleil','Spécifiques']);
    expect(fields(gw)).toContain('weekly_rain_entity');
    expect(fields(ws)).toContain('rain_total_entity');
    expect(fields(ws)).not.toContain('weekly_rain_entity');
    expect(fields(ws)).not.toContain('solar_radiation_entity');
    expect(fields(manual)).toContain('solar_radiation_entity');
    expect(fields(manual)).toContain('rain_total_entity');
  });
  it('keeps an explicit manual choice even when its sensors belong to a WS90',()=>{
    expect(profiles.selectedStationModel({station_model:'manual',temperature_entity:'sensor.ws90_temperature'})).toBe('manual');
    expect(profiles.selectedStationModel({temperature_entity:'sensor.ws90_temperature'})).toBe('ws90');
    expect(profiles.selectedStationModel({temperature_entity:'sensor.custom_temperature'})).toBe('manual');
  });
  it('finds known station devices from the entity registry when the device registry is unavailable',()=>{
    const id='sensor.ws90_temperature',states={[id]:{entity_id:id,state:'20',attributes:{}}};
    expect(profiles.modelDevices({states},{entities:[{entity_id:id,device_id:'ws',platform:'mqtt'}],devices:[]},'ws90')).toEqual(['ws']);
  });
});

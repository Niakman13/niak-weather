import {describe,it,expect} from 'vitest';
describe('History-derived station measurements',()=>{
  it('computes increases across resets, distinguishes missing coverage from dry weather',async()=>{
    const {counterIncrease}=await import('../src/station-history');
    expect(counterIncrease([{t:0,v:10},{t:10,v:12},{t:20,v:0},{t:30,v:2}],0,30)).toMatchObject({value:4,partial:false});
    expect(counterIncrease([{t:10,v:12},{t:20,v:14}],0,20)).toMatchObject({value:2,partial:true});
    expect(counterIncrease([],0,20).value).toBeUndefined();
    expect(counterIncrease([{t:20,v:12}],0,20).value).toBeUndefined();
    expect(counterIncrease([{t:0,v:10},{t:20,v:10}],0,20)).toMatchObject({value:0,partial:false});
  });
  it('calendar periods use HA timezone, including DST',async()=>{
    const {periodStarts}=await import('../src/station-history');
    const p=periodStarts(new Date('2026-10-26T08:00:00Z'),'Europe/Paris');
    expect(p.day).toBe(Date.parse('2026-10-25T23:00:00Z'));
    expect(p.week).toBe(p.day);
    expect(p.month).toBe(Date.parse('2026-09-30T22:00:00Z'));
    expect(p.year).toBe(Date.parse('2025-12-31T23:00:00Z'));
  });
  it('uses cumulative statistic sum, never adds counter readings, labels short coverage',async()=>{
    const {statisticIncrease}=await import('../src/station-history');
    expect(statisticIncrease([{start:0,end:10,sum:100},{start:10,end:20,sum:102},{start:20,end:30,sum:107}],10,30)).toMatchObject({value:7,partial:false});
    expect(statisticIncrease([{start:10,end:20,sum:102},{start:20,end:30,sum:107}],0,30)).toMatchObject({value:5,partial:true});
    expect(statisticIncrease([],0,30).value).toBeUndefined();
    expect(statisticIncrease([{start:0,end:10,sum:100},{start:10,end:20,sum:102},{start:20,end:30,sum:107}],15,30)).toMatchObject({value:5,partial:true});
  });
  it('preserves gaps and decreasing statistic sums as partial, not invented totals',async()=>{
    const {counterIncrease,statisticIncrease}=await import('../src/station-history');
    expect(counterIncrease([{t:0,v:10},{t:10},{t:20,v:12}],0,20)).toMatchObject({value:2,partial:true});
    expect(counterIncrease([{t:0,v:10},{t:10,v:9.8},{t:20,v:10.2}],0,20)).toMatchObject({value:.2,partial:true});
    expect(statisticIncrease([{start:0,end:10,sum:10},{start:20,end:30,sum:12}],10,30)).toMatchObject({value:2,partial:true});
    expect(statisticIncrease([{start:0,end:10,sum:10},{start:10,end:20,sum:5}],10,20)).toMatchObject({partial:true});
  });
  it('derives canonical rain units, temperature trend and a partial gust maximum',async()=>{
    const {deriveStation}=await import('../src/station-history');
    const now=new Date('2026-10-06T12:00:00Z'),t=now.getTime(),id='sensor.rain';
    const states={[id]:{entity_id:id,state:'12',attributes:{unit_of_measurement:'mm'}},'sensor.temp':{entity_id:'sensor.temp',state:'20',attributes:{unit_of_measurement:'°C'}},'sensor.gust':{entity_id:'sensor.gust',state:'5',attributes:{unit_of_measurement:'m/s'}}};
    const config={type:'custom:niak-weather-card',weather_entity:'weather.x',rain_total_entity:id,temperature_entity:'sensor.temp',wind_gust_entity:'sensor.gust'} as const;
    const result=deriveStation({states,config:{time_zone:'UTC'}} as any,config,{rain:[],counter:{[id]:[{s:'10',lu:(t-3600_000)/1000}]}},{'sensor.temp':[{s:'18',lu:(t-3600_000)/1000}],'sensor.gust':[{s:'10',lu:(t-3600_000)/1000}]},now);
    expect(result.rain.day).toMatchObject({value:2,partial:true});
    expect(result.temperatureTrend).toBe(2);expect(result.gustMax).toMatchObject({value:36,partial:true});
    expect(result.days).toHaveLength(7);expect(result.days[0].value).toBeUndefined();
    const direct=deriveStation({states} as any,{...config,temperature_trend_entity:'sensor.direct',max_daily_gust_entity:'sensor.max'},{rain:[],counter:{}},{},now);
    expect(direct.temperatureTrend).toBeUndefined();expect(direct.gustMax).toBeUndefined();
  });
  it('bridges statistic tail using live counter but marks missing history and converts inches',async()=>{
    const {deriveStation}=await import('../src/station-history');
    const now=new Date('2026-10-06T12:00:00Z'),end=now.getTime(),day=Date.parse('2026-10-06T00:00:00Z'),id='sensor.rain';
    const hass={states:{[id]:{entity_id:id,state:'2',attributes:{unit_of_measurement:'in'}}},config:{time_zone:'UTC'}} as any;
    const stats=[{start:day-86400_000,end:day,sum:1,state:1},{start:day,end:end-3600_000,sum:1.5,state:1.5}];
    const result=deriveStation(hass,{type:'custom:niak-weather-card',weather_entity:'weather.x',rain_total_entity:id},{rain:stats,rainUnit:'in',counter:{}},{},now);
    expect(result.rain.day.value).toBeCloseTo(25.4);expect(result.rain.day.partial).toBe(false);
    const missing=deriveStation({...hass,states:{[id]:{...hass.states[id],state:'unavailable'}}},{type:'custom:niak-weather-card',weather_entity:'weather.x',rain_total_entity:id},{rain:stats,rainUnit:'in',counter:{}},{},now);
    expect(missing.rain.day).toMatchObject({value:12.7,partial:true});
  });
  it('identifies a manual or GW2000A profile without depending on Ecowitt integration',async()=>{
    const {stationProfile}=await import('../src/station-profiles');
    expect(stationProfile({states:{}},{entities:[],devices:[]},{station_device_id:''})).toContain('configuration manuelle');
    expect(stationProfile({states:{}},{entities:[],devices:[{id:'g',name:'GW2000A'}]},{station_device_id:'g'})).toBe('GW2000A / Ecowitt');
    expect(stationProfile({states:{}},{entities:[],devices:[{id:'g',name:'WS90'}]},{station_device_id:'g'})).toBe('WS90');
  });
});

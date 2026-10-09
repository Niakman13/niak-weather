import { describe, expect, it } from 'vitest';
import gw2000aDailyRain from './fixtures/gw2000a-daily-rain-2026-10-07.json';
import { chartY, columnStatus, curvePaths, rainDays, windChartSeries, pressureChartSeries } from '../src/engine/history-series';
const now=new Date('2026-10-05T16:00:00Z');
const p=(date:string,s:string)=>({s,lu:Date.parse(date)/1000});
describe('Recorded rain days',()=>{
  it('keeps every day of a real GW2000A week whose station drops out for a few seconds',()=>{
    // Recorder export of sensor.gw2000a_daily_rain, 29/09 → 07/10/2026. The station goes `unavailable` almost every day;
    // the published card blanked every such day. The monthly counter (40.6 mm on 07/10) confirms the October values.
    const at=new Date('2026-10-07T13:20:00Z');
    const days=rainDays([...gw2000aDailyRain,{s:'19.3',lu:at.getTime()/1000}],'mm',at,'Europe/Paris');
    expect(days.map(d=>d.value)).toEqual([19.5,.3,1,0,0,.5,19.3]);
    expect(days.map(d=>d.label)).toEqual(['jeu.','ven.','sam.','dim.','lun.','mar.','Auj.']);
  });
  it('keeps absent history absent instead of fabricating zero bars',()=>{
    expect(rainDays([], 'mm', now,'Europe/Paris').every(d=>d.value===undefined)).toBe(true);
  });
  it('takes daily maxima without subtracting or accumulating across midnight resets',()=>{
    const days=rainDays([p('2026-09-28T22:00:00Z','0'),p('2026-09-29T14:00:00Z','3'),p('2026-09-29T22:00:00Z','0'),p('2026-09-30T16:00:00Z','5'),p('2026-09-30T22:00:00Z','0')],'mm',now,'Europe/Paris');
    expect(days[0]).toMatchObject({date:'2026-09-29',value:3});
    expect(days[1]).toMatchObject({date:'2026-09-30',value:5,partial:false});
    expect(days[2].value).toBe(0);
  });
  it('never carries an old nonzero daily counter into a day with no records',()=>{
    const days=rainDays([p('2026-09-29T12:00:00Z','5')],'mm',now,'Europe/Paris');
    expect(days[0]).toMatchObject({value:5,partial:true});
    expect(days[1].value).toBeUndefined();
  });
  it('keeps a day whose counter recovers after an outage and marks mid-day resets as partial',()=>{
    const days=rainDays([p('2026-09-28T22:00:00Z','0'),p('2026-09-29T12:00:00Z','unavailable'),p('2026-09-29T14:00:00Z','3'),p('2026-09-29T22:00:00Z','0'),p('2026-09-30T10:00:00Z','4'),p('2026-09-30T12:00:00Z','0')],'mm',now,'Europe/Paris');
    expect(days[0].value).toBe(3);
    expect(days[1]).toMatchObject({value:4,partial:true});
  });
  it('does not erase days whose counter is briefly unknown at the midnight reset',()=>{
    const rows=['2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05'].flatMap((d,i)=>{
      const midnight=Date.parse(`${d}T00:00:00+02:00`);
      return [{s:'unknown',lu:midnight/1000},{s:'0',lu:midnight/1000+2},...(i%2?[{s:String(i*3),lu:midnight/1000+36000}]:[])];
    });
    const days=rainDays(rows,'mm',now,'Europe/Paris');
    expect(days.map(d=>d.value)).toEqual([0,3,0,9,0,15,0]);
    expect(days.slice(1).some(d=>d.partial)).toBe(false); // The first day has no earlier reading.
  });
  it('marks a day as partial when an outage is still running at midnight',()=>{
    const days=rainDays([p('2026-09-28T22:00:00Z','0'),p('2026-09-29T08:00:00Z','2'),p('2026-09-29T18:00:00Z','unavailable'),p('2026-09-30T06:00:00Z','0')],'mm',now,'Europe/Paris');
    expect(days[0]).toMatchObject({value:2,partial:true});
    expect(days[1]).toMatchObject({value:0,partial:false});
  });
  it('leaves a day missing when the counter is unavailable all day',()=>{
    const days=rainDays([p('2026-09-28T22:00:00Z','0'),p('2026-09-29T08:00:00Z','unavailable'),p('2026-09-30T06:00:00Z','0')],'mm',now,'Europe/Paris');
    expect(days[0].value).toBeUndefined();
  });
  it('converts inches and follows the HA date rather than UTC',()=>{
    const days=rainDays([p('2026-10-04T23:00:00Z','1')],'in',now,'Europe/Paris');
    expect(days[6]).toMatchObject({date:'2026-10-05',value:25.4});
    expect(days[5].value).toBeUndefined();
  });
  it('keeps calendar days aligned over a daylight saving transition',()=>{
    const days=rainDays([],'mm',new Date('2026-10-26T00:30:00Z'),'Europe/Paris');
    expect(days.map(d=>d.date)).toEqual(['2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25','2026-10-26']);
  });
});
describe('Wind history and scale',()=>{
  it('converts recorded pressure, preserves gaps and cannot fabricate history',()=>{
    const rows=[p('2026-10-05T10:00:00Z','100000'),p('2026-10-05T12:00:00Z','unavailable'),p('2026-10-05T13:00:00Z','99600')];
    const result=pressureChartSeries(rows,'Pa',now,996);
    expect(result[0].v).toBe(1000);expect(result[12].v).toBeUndefined();expect(result[18].v).toBe(996);
    expect(pressureChartSeries([],'hPa',now,996)).toEqual([]);
  });
  it('aggregates time-weighted wind separately from gust peaks',()=>{
    const rows=[p('2026-10-05T10:00:00Z','10'),p('2026-10-05T10:09:00Z','30')];
    expect(windChartSeries(rows,'km/h',now,14,'mean')[0].v).toBe(12);
    expect(windChartSeries(rows,'km/h',now,14,'peak')[0].v).toBe(30);
    expect(windChartSeries(rows,'km/h',now,14,'mean')).toHaveLength(37);
    expect(windChartSeries([],'km/h',now,14,'mean')).toEqual([]);
  });
  it('keeps partial intervals and outages absent, with independent unit conversion',()=>{
    const rows=[p('2026-10-05T10:05:00Z','2'),p('2026-10-05T10:25:00Z','unavailable'),p('2026-10-05T10:30:00Z','5')];
    const series=windChartSeries(rows,'m/s',now,undefined,'mean');
    expect(series[0].v).toBeUndefined();expect(series[1].v).toBeCloseTo(7.2);
    expect(series[2].v).toBeUndefined();expect(series[3].v).toBe(18);
    expect(series.at(-1)?.v).toBeUndefined();
  });
  it('smooths curves without connecting across gaps',()=>{
    const start=now.getTime()-21600_000;
    const series=[10,20,10,undefined,5,10].map((v,i)=>({t:start+i*600_000,v}));
    const paths=curvePaths(series,30,now);
    expect(paths).toHaveLength(2);expect(paths[0].line).toContain(' C');
    expect(paths[0].line).not.toContain(' H');
    expect(curvePaths([{t:start,v:10}],30,now)).toEqual([]);
  });
  it('keeps brief gust peaks while bounding dense history to 37 points',()=>{
    const rows=Array.from({length:21600},(_,i)=>({s:i===5000?'150':'10',lu:now.getTime()/1000-21600+i}));
    const result=windChartSeries(rows,'km/h',now,14,'peak');
    expect(result).toHaveLength(37);
    expect(Math.max(...result.map(p=>p.v??0))).toBe(150);
  });
  it('places curves in the 100 × 50 box, the oldest point on the left edge and the newest on the right',()=>{
    const start=now.getTime()-21600_000;
    const [path]=curvePaths([{t:start,v:0},{t:now.getTime(),v:30}],30,now);
    expect(path.line.startsWith(`M0.00,${chartY(0,30).toFixed(2)}`)).toBe(true);
    expect(path.line.endsWith(`100.00,${chartY(30,30).toFixed(2)}`)).toBe(true);
    expect(chartY(30,30)).toBeLessThan(chartY(0,30));
  });
});

describe('Column status pills',()=>{
  const model=(attributes:Record<string,unknown>)=>({entity_id:'sensor.m',state:'ok',attributes} as any);
  it('echoes current rain, notable wind changes and pressure trends',()=>{
    expect(columnStatus(model({pluie_taux:1.2,vent_t:{d:9,s:'hausse'},baro:{s:'baisse',d:-1.4,f:180}}))).toEqual({rain:'Pluie en cours',wind:'Le vent s’intensifie',pressure:'La pression baisse'});
    expect(columnStatus(model({pluie_taux:5,vent_t:{d:-10,s:'baisse'},baro:{s:'hausse'}}))).toEqual({rain:'Forte pluie en cours',wind:'Le vent faiblit',pressure:'La pression monte'});
  });
  it('stays silent when nothing notable happens or data is missing',()=>{
    expect(columnStatus(model({pluie_taux:0,vent_t:{d:4,s:'hausse'},baro:{s:'stable'}}))).toEqual({rain:undefined,wind:undefined,pressure:undefined});
    expect(columnStatus(model({vent_t:{d:-999,s:''}}))).toEqual({rain:undefined,wind:undefined,pressure:undefined});
    expect(columnStatus(undefined)).toEqual({rain:undefined,wind:undefined,pressure:undefined});
  });
});

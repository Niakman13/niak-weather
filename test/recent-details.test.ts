import { describe, expect, it } from 'vitest';
import { rainDays, windPoints, windScale, windChartSeries, windCurvePaths, pressureChartSeries } from '../src/recent-details';
const now=new Date('2026-10-05T16:00:00Z');
const p=(date:string,s:string)=>({s,lu:Date.parse(date)/1000});
describe('Recorded rain days',()=>{
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
  it('marks outages as missing and mid-day resets as partial',()=>{
    const days=rainDays([p('2026-09-28T22:00:00Z','0'),p('2026-09-29T12:00:00Z','unavailable'),p('2026-09-29T14:00:00Z','3'),p('2026-09-29T22:00:00Z','0'),p('2026-09-30T10:00:00Z','4'),p('2026-09-30T12:00:00Z','0')],'mm',now,'Europe/Paris');
    expect(days[0].value).toBeUndefined();
    expect(days[1]).toMatchObject({value:4,partial:true});
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
    const paths=windCurvePaths(series,30,now);
    expect(paths).toHaveLength(2);expect(paths[0].line).toContain(' C');
    expect(paths[0].line).not.toContain(' H');
    expect(windCurvePaths([{t:start,v:10}],30,now)).toEqual([]);
  });
  it('keeps brief gust peaks while bounding dense history to 37 points',()=>{
    const rows=Array.from({length:21600},(_,i)=>({s:i===5000?'150':'10',lu:now.getTime()/1000-21600+i}));
    const result=windChartSeries(rows,'km/h',now,14,'peak');
    expect(result).toHaveLength(37);
    expect(Math.max(...result.map(p=>p.v??0))).toBe(150);
  });
  it('does not create a historic curve from a current reading alone',()=>{
    expect(windPoints([],'km/h',now,14)).toEqual([]);
  });
  it('keeps the beginning state, outages and current value in metric units',()=>{
    const points=windPoints([p('2026-10-05T09:00:00Z','2'),p('2026-10-05T12:00:00Z','unavailable'),p('2026-10-05T13:00:00Z','5')],'m/s',now,14);
    expect(points[0]).toEqual({t:Date.parse('2026-10-05T10:00:00Z'),v:7.2});
    expect(points.some(p=>p.v===undefined)).toBe(true);
    expect(points.at(-1)?.v).toBe(14);
  });
  it('does not bridge the end of an unavailable sensor',()=>{
    expect(windPoints([p('2026-10-05T14:00:00Z','10')],'km/h',now).at(-1)?.v).toBeUndefined();
  });
  it('bounds dense history while keeping peaks',()=>{
    const rows=Array.from({length:21600},(_,i)=>({s:i===5000?'150':'10',lu:now.getTime()/1000-21600+i}));
    const result=windPoints(rows,'km/h',now,14);
    expect(result.length).toBeLessThan(400);
    expect(Math.max(...result.map(p=>p.v??0))).toBe(150);
  });
  it('uses a readable scale instead of treating the maximum as 100 percent',()=>{
    expect(windScale(14,30)).toBe(80);
    expect(windScale(90,150)).toBe(160);
    expect(windScale(0,0)).toBe(80);
  });
});

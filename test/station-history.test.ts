import {describe,it,expect} from 'vitest';
describe('History-derived station measurements',()=>{
  it('computes increases across resets, distinguishes missing coverage from dry weather',async()=>{
    const {counterIncrease}=await import('../src/station-history');
    expect(counterIncrease([{t:0,v:10},{t:10,v:12},{t:20,v:0},{t:30,v:2}],0,30)).toMatchObject({value:4,partial:false});
    expect(counterIncrease([{t:10,v:12},{t:20,v:14}],0,20)).toMatchObject({value:2,partial:true});
    expect(counterIncrease([],0,20).value).toBeUndefined();
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
  });
});

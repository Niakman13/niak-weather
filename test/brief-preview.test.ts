import { describe, expect, it } from 'vitest';
import { briefPreview } from '../src/brief-preview';
import type { WeatherBrief, BriefSignal } from '../src/weather-brief';
const signal = (key: string, group: BriefSignal['group'], severity: BriefSignal['severity']): BriefSignal => ({key,group,severity,text:key,explanation:key,icon:'mdi:weather-sunny'});
const brief = (signals: BriefSignal[]): WeatherBrief => ({signals,title:'',summary:'',label:'',rgb:'',icon:'',available:true,caveats:[]});
describe('Concise summary presentation', () => {
  it('keeps the highest attention and upcoming event, limits to three, counts omitted signals', () => {
    const result=briefPreview(brief([signal('official','official',3),signal('wind','now',2),signal('storm','future',2),signal('air','environment',2),signal('pollen','environment',1)]));
    expect(result.selected.map(s=>s.key)).toEqual(['official','storm','wind']);expect(result.remaining).toBe(2);
  });
  it('does not promote informational measurements into attention signals', () => {
    expect(briefPreview(brief([signal('pressure','now',0),signal('indoor','environment',0)])).selected).toEqual([]);
  });
  it('retains pollution when it is the highest attention signal', () => {
    expect(briefPreview(brief([signal('air','environment',2),signal('rain','future',1),signal('wind','now',1)])).selected.map(s=>s.key)).toEqual(['air','rain','wind']);
  });
  it('does not duplicate a sole signal', () => {
    const s=signal('wind','now',2);expect(briefPreview(brief([s]))).toEqual({selected:[s],remaining:0});
  });
});

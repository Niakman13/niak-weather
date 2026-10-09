import { describe, expect, it } from 'vitest';
import { briefPreview, briefPresentation, briefSecondarySignals } from '../src/engine/brief-preview';
import type { WeatherBrief, BriefSignal } from '../src/engine/weather-brief';
const signal = (key: string, group: BriefSignal['group'], severity: BriefSignal['severity']): BriefSignal => ({key,group,severity,text:key,explanation:key,icon:'mdi:weather-sunny'});
const brief = (signals: BriefSignal[]): WeatherBrief => ({signals,title:'',summary:'',label:'',rgb:'',icon:'',available:true,caveats:[]});
describe('Concise summary presentation', () => {
  it('lists the secondary lines as vigilance, then now, then what is coming',()=>{
    // 07/10/2026 at Gardanne: heavy rain headline, storm in 6 h, yellow vigilance, comfort gap.
    const lines=briefSecondarySignals(brief([signal('rain-soon','future',2),signal('storm-later','future',1),signal('vigilance','official',1),signal('comfort-gap','now',0)]));
    expect(lines.map(s=>s.group)).toEqual(['official','now','future']);
  });
  it('shows meaningful pressure alongside pollution, not an empty outlook',()=>{
    expect(briefSecondarySignals(brief([signal('air','environment',2),signal('pressure','now',0)])).map(s=>s.key)).toEqual(['pressure']);
    expect(briefSecondarySignals(brief([]))).toEqual([]);
    expect(briefSecondarySignals(brief([signal('pressure','now',0)]))).toEqual([]);
    expect(briefSecondarySignals(brief([signal('air','environment',2),signal('temperature-future','future',0)])).map(s=>s.key)).toEqual([]);
  });
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
  it('uses measured rain or a meaningful pressure trend without inventing an attention level',()=>{
    for(const key of ['rain-now','pressure']) {
      const result=briefPresentation(brief([signal(key,'now',0),signal('temperature-future','future',0)]));
      expect(result.headline).toBe(key);expect(result.contextKey).toBe(key);
      expect(result.outlookKey).toBeUndefined();expect(result.selected).toEqual([]);
    }
    expect(briefPresentation(brief([signal('wind-soft','now',0)])).headline).toBeUndefined();
  });
  it('uses a forecast outlook without Atmo or attention signals, without raising its level',()=>{
    const b=brief([signal('wind-soft','now',0),{...signal('temperature-future','future',0),text:'Fraîcheur annoncée dans 5 h',icon:'mdi:thermometer'}]);
    const result=briefPresentation(b);
    expect(result.headline).toBe('Fraîcheur annoncée dans 5 h');
    expect(result.icon).toBe('mdi:thermometer');expect(result.outlookKey).toBe('temperature-future');
    expect(result.selected).toEqual([]);expect(b.signals.every(s=>s.severity===0)).toBe(true);
  });
  it('leaves the brief empty when nothing useful stands out',()=>{
    expect(briefPresentation(brief([])).headline).toBeUndefined();
    expect(briefPresentation({...brief([]),available:false}).headline).toBeUndefined();
  });
  it('retains priority attention even when a mild outlook is available',()=>{
    const result=briefPresentation({...brief([signal('official','official',2),signal('temperature-future','future',0)]),title:'Vigilance orange · orages'});
    expect(result.headline).toBe('Vigilance orange · orages');expect(result.outlookKey).toBeUndefined();
  });
});

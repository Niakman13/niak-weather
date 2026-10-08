import { describe, expect, it } from 'vitest';
import { alertPoint, tickerPoints, vigilanceParts } from '../src/compact-points';
import type { BriefSignal, WeatherBrief } from '../src/weather-brief';
const signal = (key: string, group: BriefSignal['group'], severity: BriefSignal['severity'], text = key): BriefSignal => ({key,group,severity,text,explanation:key,icon:'mdi:weather-sunny'});
const brief = (signals: BriefSignal[]): WeatherBrief => ({signals,title:'',summary:'',label:'',rgb:'',icon:'',available:true,caveats:[]});
describe('Tile and intermediate brief', () => {
  it('scrolls the banner points, most important first, without the official warning', () => {
    // Yellow storm vigilance at Gardanne, storm tonight, 72 mm tomorrow, a 5 °C feel gap.
    const points=tickerPoints(brief([signal('official','official',1,'Vigilance jaune · orages'),signal('storm','future',2),signal('rain-future','future',1),signal('comfort-gap','now',0)]));
    expect(points.map(p=>p.text)).toEqual(['storm','rain-future','comfort-gap']);
    expect(points.map(p=>p.label)).toEqual(['À venir','À venir','Maintenant']);
    expect(points.map(p=>p.level)).toEqual([2,1,0]);
  });
  it('labels air and pollens, keeps at most four points', () => {
    const points=tickerPoints(brief([signal('air-false','environment',2),signal('pollen-true','environment',1),signal('wind','now',1),signal('storm','future',1),signal('pressure','now',0)]));
    expect(points.length).toBeLessThanOrEqual(4);
    expect(points.find(p=>p.text==='air-false')?.label).toBe('Air');
    expect(tickerPoints(brief([signal('pollen-true','environment',1)]))[0].label).toBe('Pollens');
  });
  it('shows a quiet context when nothing needs attention, nothing without a brief', () => {
    expect(tickerPoints(brief([signal('comfort-gap','now',0)])).map(p=>p.text)).toEqual(['comfort-gap']);
    expect(tickerPoints(undefined)).toEqual([]);
  });
  it('puts the vigilance in the alert bubble, level above the phenomena', () => {
    const a=alertPoint(brief([signal('official','official',2,'Vigilance orange · orages, vent violent (jaune)')]));
    expect(a).toMatchObject({level:2,label:'Vigilance orange',text:'Orages, vent violent (jaune)',official:true});
  });
  it('without vigilance, shows the most important point that needs attention, like heavy measured rain', () => {
    // 8,2 mm/h measured at Gardanne, no official vigilance.
    const a=alertPoint(brief([signal('comfort-gap','now',0),signal('rain-now','now',2,'Pluie forte (8,2 mm/h)')]));
    expect(a).toMatchObject({level:2,label:'Maintenant',text:'Pluie forte (8,2 mm/h)',official:false});
    expect(alertPoint(brief([signal('comfort-gap','now',0)]))).toBeUndefined();
  });
  it('keeps the vigilance in the bubble even when a brief point is more severe', () => {
    const a=alertPoint(brief([signal('storm','future',2,'Orage annoncé'),signal('official','official',1,'Vigilance jaune · orages')]));
    expect(a).toMatchObject({official:true,label:'Vigilance jaune'});
  });
  it('puts the vigilance level above its phenomena, other texts on one line', () => {
    expect(vigilanceParts('Vigilance jaune · vent violent')).toEqual({level:'Vigilance jaune',detail:'Vent violent'});
    expect(vigilanceParts('Vigilance orange · orages, vent violent (jaune)')).toEqual({level:'Vigilance orange',detail:'Orages, vent violent (jaune)'});
    expect(vigilanceParts('Vigilance jaune')).toEqual({detail:'Vigilance jaune'});
    expect(vigilanceParts('Vent soutenu, rafales à 43,9 km/h')).toEqual({detail:'Vent soutenu, rafales à 43,9 km/h'});
  });
});

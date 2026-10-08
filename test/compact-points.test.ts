import { describe, expect, it } from 'vitest';
import { tickerPoints, vigilanceBadge, vigilanceParts } from '../src/compact-points';
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
  it('shows the brief vigilance text unchanged', () => {
    // The same words on the tile, the intermediate and the full card.
    const badge=vigilanceBadge(brief([signal('official','official',2,'Vigilance orange · orages, vent violent (jaune)')]));
    expect(badge).toMatchObject({level:2,label:'Vigilance orange · orages, vent violent (jaune)'});
    expect(vigilanceBadge(brief([signal('wind','now',2)]))).toBeUndefined();
  });
  it('puts the vigilance level above its phenomena, other texts on one line', () => {
    expect(vigilanceParts('Vigilance jaune · vent violent')).toEqual({level:'Vigilance jaune',detail:'Vent violent'});
    expect(vigilanceParts('Vigilance orange · orages, vent violent (jaune)')).toEqual({level:'Vigilance orange',detail:'Orages, vent violent (jaune)'});
    expect(vigilanceParts('Vigilance jaune')).toEqual({detail:'Vigilance jaune'});
    expect(vigilanceParts('Vent soutenu, rafales à 43,9 km/h')).toEqual({detail:'Vent soutenu, rafales à 43,9 km/h'});
  });
});

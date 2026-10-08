import { describe, expect, it } from 'vitest';
import { tickerPoints, vigilanceBadge } from '../src/compact-points';
import type { BriefSignal, WeatherBrief } from '../src/weather-brief';
const signal = (key: string, group: BriefSignal['group'], severity: BriefSignal['severity'], text = key): BriefSignal => ({key,group,severity,text,explanation:key,icon:'mdi:weather-sunny'});
const brief = (signals: BriefSignal[]): WeatherBrief => ({signals,title:'',summary:'',label:'',rgb:'',icon:'',available:true,caveats:[]});
describe('Tile and intermediate brief', () => {
  it('scrolls the banner points, most important first, without the official warning', () => {
    // Yellow storm vigilance at Gardanne, storm tonight, 72 mm tomorrow, a 5 °C feel gap.
    const points=tickerPoints(brief([signal('official','official',1,'Vigilance Météo-France jaune : Orages (jaune)'),signal('storm','future',2),signal('rain-future','future',1),signal('comfort-gap','now',0)]));
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
  it('names the vigilance colour and phenomena, short for the tile', () => {
    const badge=vigilanceBadge(brief([signal('official','official',2,'Vigilance Météo-France orange : Orages (orange), Vent violent (jaune)')]));
    expect(badge).toMatchObject({level:2,label:'Vigilance orange orages, vent violent',short:'Orange orages +1'});
    expect(vigilanceBadge(brief([signal('official','official',1,'Vigilance Météo-France jaune')]))?.short).toBe('Jaune');
    expect(vigilanceBadge(brief([signal('wind','now',2)]))).toBeUndefined();
  });
});

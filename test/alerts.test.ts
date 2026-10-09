import { describe, expect, it } from 'vitest';
import { alertPoints, themeOf, tickerPoints, vigilanceParts } from '../src/engine/alerts';
import type { BriefSignal, WeatherBrief } from '../src/engine/weather-brief';
const signal = (key: string, group: BriefSignal['group'], severity: BriefSignal['severity'], text = key): BriefSignal => ({key,group,severity,text,explanation:key,icon:'mdi:weather-sunny'});
const brief = (signals: BriefSignal[]): WeatherBrief => ({signals,title:'',summary:'',label:'',rgb:'',icon:'',available:true,caveats:[]});
describe('Alerts and brief bubbles', () => {
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
    const [a]=alertPoints(brief([signal('official','official',2,'Vigilance orange · orages, vent violent (jaune)')]));
    expect(a).toMatchObject({level:2,label:'Vigilance orange',text:'Orages, vent violent (jaune)',official:true});
  });
  it('without vigilance, shows the most important point that needs attention, like heavy measured rain', () => {
    // 8,2 mm/h measured at Gardanne, no official vigilance.
    const alerts=alertPoints(brief([signal('comfort-gap','now',0),signal('rain-now','now',2,'Pluie forte (8,2 mm/h)')]));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({level:2,label:'Maintenant',text:'Pluie forte (8,2 mm/h)',official:false});
    expect(alertPoints(brief([signal('comfort-gap','now',0)]))).toEqual([]);
  });
  it('shows the vigilance and the measured alert together, the vigilance first', () => {
    // Yellow storm vigilance at Gardanne while the station measures 8,2 mm/h.
    const alerts=alertPoints(brief([signal('rain-now','now',2,'Forte pluie : 8,2 mm/h'),signal('official','official',1,'Vigilance jaune · orages')]));
    expect(alerts.map(a=>a.label)).toEqual(['Vigilance jaune','Maintenant']);
    expect(alerts.map(a=>a.official)).toEqual([true,false]);
  });
  it('gives each point the colour of its theme', () => {
    expect(themeOf(signal('rain-now','now',1))).toBe('rain');
    expect(themeOf(signal('wind-soft','now',0))).toBe('wind');
    expect(themeOf({...signal('comfort-gap','now',0),icon:'mdi:thermometer-low'})).toBe('cold');
    expect(themeOf({...signal('comfort-gap','now',0),icon:'mdi:thermometer-high'})).toBe('heat');
    expect(themeOf(signal('air-false','environment',1))).toBe('calm');
  });
  it('puts the vigilance level above its phenomena, other texts on one line', () => {
    expect(vigilanceParts('Vigilance jaune · vent violent')).toEqual({level:'Vigilance jaune',detail:'Vent violent'});
    expect(vigilanceParts('Vigilance orange · orages, vent violent (jaune)')).toEqual({level:'Vigilance orange',detail:'Orages, vent violent (jaune)'});
    expect(vigilanceParts('Vigilance jaune')).toEqual({detail:'Vigilance jaune'});
    expect(vigilanceParts('Vent soutenu, rafales à 43,9 km/h')).toEqual({detail:'Vent soutenu, rafales à 43,9 km/h'});
  });
});

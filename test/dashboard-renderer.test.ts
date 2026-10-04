import { describe, expect, it } from 'vitest';
import { renderLocal } from '../src/local-renderer';
const render = (attributes: Record<string, unknown>) => renderLocal({ ent:'sensor.model',dashboard:true }, {'sensor.model':{state:'ready',attributes}}, {});
describe('Dashboard measurements', () => {
  it('keeps four labelled measurements when station data is missing, without false calm or dry claims', () => {
    const output=render({});
    expect(output.tuiles.match(/class="me-tu"/g)).toHaveLength(4);
    for (const title of ['Température','Vent','Pluie','Pression']) expect(output.tuiles).toContain(title);
    expect(output.tuiles).toContain('intensité indisponible');
    expect(output.tuiles).not.toContain('pas de pluie en ce moment');
    expect(output.tuiles).not.toContain('0,0');
    expect(output.comfort).toBe('');
  });
  it('extracts the complete gauge and contributions without copying the hero', () => {
    const output=render({t_ext:20,ressenti:22,humidex:22,effet_vent:-1,phrase_ressenti:'humidité'});
    expect(output.comfort).toContain('class="me-jauge"');
    expect(output.comfort).toContain('humidex');
    expect(output.comfort).toContain('nw-feels-value');
    expect(output.comfort).toContain('22,0<small>°C</small>');
    expect(output.comfort).not.toContain('me-htop');
    expect(output.tuiles).toContain('ressenti 22,0 °C');
  });
  it('names calendar counters without claiming rolling totals', () => {
    const output=render({pluie_semaine:12,pluie_mois:40});
    expect(output.bilan).toContain('Cette semaine');expect(output.bilan).toContain('Ce mois');
    expect(output.bilan).not.toContain('7 jours');expect(output.bilan).not.toContain('30 jours');
  });
});

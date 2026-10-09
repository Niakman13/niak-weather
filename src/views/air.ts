// Air and pollens from Atmo France: the same panel for today (in « Aujourd'hui ») and tomorrow (in « Prévisions »).
import { css, html, nothing, svg, type TemplateResult } from 'lit';
import type { AtmoReading } from '../engine/atmo';
import type { AirItem, AirPanel } from '../engine/view-model';
import { chip, label, nf, panelHead } from '../ui/parts';

/** The six Atmo steps, in the charter's colours: good, fair, then the three alert levels, then the worst. */
const STEPS = ['calm', 'calm', 'level1', 'level2', 'level3', 'pressure'];
const level = (r?: AtmoReading) => r && !r.stale && r.value !== undefined && r.value <= 6 ? r.value : 0;

/** Six notches filled up to the level, the level in the middle. */
function disc(r?: AtmoReading): TemplateResult {
  const value = level(r);
  const arc = (i: number) => {
    const a0 = (i * 60 - 88) * Math.PI / 180, a1 = ((i + 1) * 60 - 92) * Math.PI / 180, R = 32, C = 38;
    return svg`<path d=${`M${C + R * Math.cos(a0)} ${C + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${C + R * Math.cos(a1)} ${C + R * Math.sin(a1)}`} fill="none" stroke-width="9" stroke-linecap="round"
      stroke=${i < value ? `var(--nw-${STEPS[i]})` : 'color-mix(in oklab,var(--nw-fg) 10%,transparent)'}/>`;
  };
  return html`<svg class="disc" viewBox="0 0 76 76" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map(arc)}
    <text x="38" y="44" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor">${value || '–'}</text></svg>`;
}

/** What a detail line says: its level, or its concentration as published. */
function detail(item: AirItem): string {
  const r = item.reading, c = item.concentration;
  const concentration = (x: AtmoReading) => x.value === undefined ? 'concentration indisponible' : `${nf(x.value, 2)}${x.unit ? ` ${x.unit}` : ''}`;
  const value = r.unit !== undefined ? concentration(r) : `${r.label}${c ? ` · ${concentration(c)}` : ''}`;
  return `${value}${r.stale ? ' · données anciennes' : ''}`;
}

function panel(p: AirPanel): TemplateResult {
  const air = p.kind === 'air', r = p.primary, value = level(r);
  const word = !r ? 'Indice non configuré' : r.stale ? 'Données anciennes' : r.value === 7 ? 'Événement signalé' : r.label;
  return html`<section class="nw-panel" aria-label=${`${air ? 'Air extérieur' : 'Pollens'} ${p.tomorrow ? 'demain' : 'aujourd’hui'}`}>
    ${panelHead(air ? 'mdi:air-filter' : 'mdi:flower-pollen-outline', 'calm', air ? 'Air extérieur' : 'Pollens', 'Atmo France')}
    <p class="nw-sub">${p.tomorrow ? 'Demain' : 'Aujourd’hui'}${p.zone ? ` · ${p.zone}` : ''}</p>
    <div class="aq" data-entity=${r?.id ?? nothing} role=${r ? 'button' : nothing} tabindex=${r ? 0 : nothing}>${disc(r)}
      <div class="txt">${label(p.tomorrow ? 'Indice de demain' : 'Indice du jour')}<strong>${word}</strong>
        <small>${value ? `Niveau ${value} sur 6` : r?.value === 7 ? 'Code 7 · hors échelle' : 'Niveau indisponible'}</small></div></div>
    ${p.worse ? html`<div class="nw-chips">${chip({ theme: `level${Math.min(3, Math.max(1, level(p.worse.reading) - 2))}` as 'level1', icon: 'mdi:alert-circle-outline',
      value: p.worse.label, label: p.worse.reading.label.toLowerCase(), entity: p.worse.reading.id })}</div>` : nothing}
    ${p.details.length || p.updated ? html`<details class="nw-details"><summary><ha-icon icon="mdi:chevron-right"></ha-icon>${air ? 'Détail des polluants' : 'Détail des pollens'}</summary>
      ${p.details.length ? html`<ul>${p.details.map(d => html`<li data-entity=${d.reading.id}><span>${d.label}</span><b>${detail(d)}</b></li>`)}</ul>` : nothing}
      ${p.updated ? html`<p>Publication Atmo : ${p.updated}.${p.stale ? ' Certaines données sont anciennes : à vérifier dans l’intégration.' : ''}</p>` : nothing}</details>` : nothing}
  </section>`;
}

export const renderAir = (panels: AirPanel[]) => panels.length ? html`<div class="panels-two">${panels.map(panel)}</div>` : nothing;

export const airStyles = css`
  .panels-two { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:16px; align-items:stretch; }
  .panels-two > :only-child { grid-column:1/-1; }
  @container (max-width:640px) { .panels-two { grid-template-columns:minmax(0,1fr); } }
  .aq { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:16px; }
  .aq .disc { width:76px; height:76px; }
  .aq .txt { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .aq strong { font-size:var(--nw-fs-title); font-weight:700; }
  .aq small { font-size:var(--nw-fs-small); color:var(--nw-fg2); }
`;

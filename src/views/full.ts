// The full card: the banner, then « Aujourd'hui » and « Prévisions », each folded or unfolded with a tap on its title.
import { css, html, nothing, type TemplateResult } from 'lit';
import type { WeatherView } from '../view';
import type { AirBlock, ForecastBlock, FullBlock, TodayBlock } from '../types';
import { renderAir } from './air';
import { renderForecasts } from './forecasts';
import { bulletinBlock, renderHero, type BannerBlock } from './hero';
import { forecastStrip, frise, moments } from './tile';
import { renderToday } from './today';

export type SectionId = 'today' | 'predictions' | 'air';
export interface FullOptions {
  sky: TemplateResult; uid: string; entity: string;
  /** A local thermometer: the feel is compared with it rather than with the bulletin. */
  station: boolean;
  show: { synthesis: boolean; today: boolean; predictions: boolean };
  /** The blocks chosen, in their order; unset, `show` decides as before. */
  blocks?: FullBlock[];
  today?: TodayBlock[]; forecasts?: ForecastBlock[]; air?: AirBlock[];
  /** The hours/days strip: its tab and the switch between them. */
  tab: 'hours' | 'days'; onTab: (tab: 'hours' | 'days') => void;
  folded: Record<SectionId, boolean>;
  onFold: (id: SectionId) => void;
}

function section(id: SectionId, title: string, subtitle: string, o: FullOptions, body: () => TemplateResult): TemplateResult {
  const folded = o.folded[id];
  const toggle = (e: Event) => { if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); o.onFold(id); };
  return html`<section class=${`fm-section${folded ? ' folded' : ''}`} aria-labelledby=${`${o.uid}-${id}`}>
    <header class="fm-head" role="button" tabindex="0" aria-expanded=${!folded} @click=${toggle} @keydown=${toggle}>
      <h2 id=${`${o.uid}-${id}`}>${title}</h2><span>${subtitle}</span>
      <span class="fm-fold" aria-hidden="true"><ha-icon icon="mdi:chevron-down"></ha-icon></span></header>
    ${folded ? nothing : html`<div class="fm-body">${body()}</div>`}
  </section>`;
}

export function renderFull(v: WeatherView, o: FullOptions): TemplateResult {
  const isBanner = (b: FullBlock): b is BannerBlock => b === 'bulletin' || b === 'events' || b === 'moments' || b === 'forecast';
  const draw = (b: BannerBlock) => b === 'bulletin' ? html`<div class="hero-bulletin">${bulletinBlock(v)}</div>` : b === 'events' ? frise(v)
    : b === 'moments' ? moments(v) : forecastStrip(v, o.tab, o.onTab);
  const today = () => section('today', 'Aujourd’hui', v.comfort ? 'Mesures et ressenti' : 'Conditions actuelles', o,
    () => renderToday(v, o.uid, o.station, o.blocks ? nothing : renderAir(v.air.today), o.today));
  const predictions = () => section('predictions', 'Prévisions', v.forecastSource, o,
    () => renderForecasts(v, o.entity, o.uid, o.blocks ? nothing : renderAir(v.air.tomorrow), o.forecasts));
  if (o.blocks) {
    // The banner takes the blocks that come before the first section; after it, each block shows exactly where the list puts it.
    const first = o.blocks.findIndex(b => !isBanner(b)), lead = (first < 0 ? o.blocks : o.blocks.slice(0, first)) as BannerBlock[];
    const chosen = o.air ?? ['air', 'pollen', 'tomorrow'];
    const air = [...v.air.today, ...(chosen.includes('tomorrow') ? v.air.tomorrow : [])].filter(p => chosen.includes(p.kind));
    return html`<div class="nw-full">${renderHero(v, o.sky, o.uid, lead, draw)}
      ${(first < 0 ? [] : o.blocks.slice(first)).map(b => isBanner(b) ? html`<section class="fm-section fm-plain">${draw(b)}</section>`
        : b === 'today' ? today() : b === 'predictions' ? predictions()
        : b === 'air' && air.length ? section('air', 'Air et pollens', chosen.includes('tomorrow') ? 'Aujourd’hui et demain' : 'Aujourd’hui', o, () => renderAir(air) as TemplateResult)
        : nothing)}</div>`;
  }
  return html`<div class="nw-full">
    ${o.show.synthesis ? renderHero(v, o.sky, o.uid, ['bulletin', 'events'], draw) : nothing}
    ${o.show.today ? today() : nothing}
    ${o.show.predictions ? predictions() : nothing}
  </div>`;
}

export const fullStyles = css`
  .nw-full { container-type:inline-size; color:var(--nw-fg); }
  .fm-section { padding:20px 24px 24px; border-top:1px solid var(--nw-line-soft); }
  .nw-full > .fm-section:first-child { border-top:0; }
  .fm-head { display:flex; align-items:center; gap:10px; min-width:0; }
  .fm-section > .fm-head { cursor:pointer; user-select:none; -webkit-user-select:none; border-radius:var(--nw-radius); }
  .fm-head:focus-visible { outline:2px solid var(--nw-accent); outline-offset:4px; }
  .fm-head h2 { margin:0; font-size:var(--nw-fs-title); font-weight:750; letter-spacing:-.2px; }
  .fm-head > span:not(.fm-fold):not(.nw-chip) { font-size:var(--nw-fs-small); color:var(--nw-fg2); flex:1; min-width:0; }
  .fm-fold { display:grid; place-items:center; width:30px; height:30px; flex:none; border-radius:var(--nw-radius-pill); border:1px solid var(--nw-line); background:var(--nw-bg); color:var(--nw-fg2); }
  .fm-fold ha-icon { --mdc-icon-size:20px; transition:transform .3s; }
  .folded .fm-fold ha-icon { transform:rotate(-90deg); }
  .fm-body { display:grid; gap:16px; margin-top:16px; }
  /* A banner block placed after a section: on the card's own background, without the sky. */
  .fm-plain > .hero-bulletin, .fm-plain > .nw-events, .fm-plain > .block { display:flex; flex-direction:column; gap:6px; }
  @container (max-width:560px) { .fm-section { padding:16px 14px 18px; } }
`;

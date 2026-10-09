// The tile: on the dashboard it is one band; a tap unfolds it in place (bulletin, moments, forecasts), a long press opens the full card.
import { css, html, nothing, type TemplateResult } from 'lit';
import type { Bulletin, WeatherView } from '../view';
import { alertBubble, label, nf, rainLine, tile } from '../ui/parts';
import '../ui/ticker';

export interface TileState {
  open: boolean; tab: 'hours' | 'days';
  /** What a long press opens: the full card over the page, or the user's weather page. */
  holdTarget: 'card' | 'page';
  onTab: (tab: 'hours' | 'days') => void;
}

const temps = (p: Bulletin['periods'][number]) => p.tmin === undefined ? '—' : p.tmin === p.tmax ? `${p.tmin} °C` : `${p.tmin}–${p.tmax} °C`;

/** « En ce moment »: condition, temperature, then the source. Shared by the tile and the banner. */
export function nowBlock(v: WeatherView, kicker: boolean, extra: unknown = nothing): TemplateResult {
  const n = v.now;
  return html`<div class="nw-now">${kicker ? label('En ce moment') : nothing}
    <span class="cond" data-entity=${n.conditionEntity ?? nothing} title=${n.source}><ha-icon icon=${n.icon}></ha-icon>${n.label}</span>
    ${n.temperature === undefined ? html`<span class="cond">Température indisponible</span>`
      : html`<span class="temp" data-entity=${n.temperatureEntity ?? nothing} aria-label=${`${n.temperatureSource} : ${nf(n.temperature)} degrés Celsius`}>${nf(n.temperature)}<small>°C</small></span>`}
    ${extra}<span class="nw-badge">${n.temperatureSource}</span></div>`;
}

/** The four moments of the day, in see-through tiles over the sky. Shared with the banner. */
export const moments = (b: Bulletin) => html`<div class="moments">${b.periods.map(p => tile(p.label, p.icon, temps(p),
  html`<small>${p.phrase}</small>${p.rain >= 1 ? rainLine(p.rain) : nothing}`, p.text))}</div>`;

function forecasts(v: WeatherView, s: TileState): TemplateResult | typeof nothing {
  const hours = v.hours.slice(0, 12).filter(h => h.temperature !== undefined), days = v.days.slice(0, 5);
  if (!hours.length && !days.length) return nothing;
  const tab = !hours.length ? 'days' : !days.length ? 'hours' : s.tab;
  const select = (t: 'hours' | 'days') => (e: Event) => { e.stopPropagation(); s.onTab(t); };
  return html`<div class="section-title">${label('Prévisions')}
      ${hours.length && days.length ? html`<span class="seg" role="group" aria-label="Prévisions affichées">
        <button type="button" aria-pressed=${tab === 'hours'} @click=${select('hours')} @pointerdown=${stopPress}>Heures</button>
        <button type="button" aria-pressed=${tab === 'days'} @click=${select('days')} @pointerdown=${stopPress}>Jours</button></span>` : nothing}</div>
    ${tab === 'hours'
      ? html`<div class="hours">${hours.map(h => tile(`${h.hour} h`, h.icon, `${nf(h.temperature!, 0)}°`, rainLine(h.precipitation)))}</div>`
      : html`<div class="days">${days.map(d => tile(d.label, d.icon, d.high === undefined ? '—' : `${d.high}°`,
          html`<span class="lo">${d.low === undefined ? '' : `${d.low}°`}</span>${rainLine(d.rain)}`, d.conditionLabel))}</div>`}`;
}
/** The day/hour switch must not start a long press on the card. */
const stopPress = (e: Event) => e.stopPropagation();

export function renderTile(v: WeatherView, sky: TemplateResult, s: TileState): TemplateResult {
  // Folded, the tile has room for one alert; the others lead the scrolling bubble, keeping their alert style.
  const [first, ...more] = v.alerts;
  const points = s.open ? v.points : [...more.map(a => ({ ...a, alert: true as const })), ...v.points];
  const headline = v.bulletin?.summary;
  return html`<div class=${`nw-tilecard${s.open ? ' open' : ''}${v.now.darkSky ? ' dark-sky' : ''}${points.length ? '' : ' quiet'}`}
      role="button" tabindex="0" aria-expanded=${s.open}
      aria-label=${`Météo${v.location ? ` à ${v.location}` : ''} : appui pour ${s.open ? 'replier' : 'déplier'}, appui long pour ${s.holdTarget === 'page' ? 'la page météo' : 'la carte complète'}`}>
    <div class="sky" aria-hidden="true">${sky}</div><div class="veil" aria-hidden="true"></div><i class="press-ring" aria-hidden="true"></i>
    <div class="top">
      <div class="meta">${v.location ? html`<span class="place">${v.location}</span>` : nothing}${first ? alertBubble(first) : nothing}
        ${more.map(a => html`<div class="reveal"><div>${alertBubble(a)}</div></div>`)}</div>
      <div class="brief">${points.length ? html`<niak-ticker .points=${points}></niak-ticker>` : nothing}</div>
      ${nowBlock(v, false)}
    </div>
    <div class="grabber" aria-hidden="true"><i></i></div>
    <div class="more" ?inert=${!s.open}><div><div class="more-in">
      ${headline ? html`<p class="headline">${headline}</p>` : nothing}
      ${v.bulletin ? moments(v.bulletin) : nothing}
      ${forecasts(v, s)}
      <div class="foot"><span>${v.forecastSource}${v.now.temperatureSource !== v.forecastSource ? ` · ${v.now.temperatureSource.toLowerCase()}` : ''}</span>
        <span>Appui long : ${s.holdTarget === 'page' ? 'page météo' : 'carte complète'}</span></div>
    </div></div></div>
  </div>`;
}

export const tileStyles = css`
  .nw-tilecard { position:relative; isolation:isolate; overflow:hidden; cursor:pointer; user-select:none; -webkit-user-select:none; -webkit-tap-highlight-color:transparent;
    color:var(--nw-fg); border-radius:inherit; transition:box-shadow .2s; }
  .nw-tilecard:focus-visible { outline:2px solid var(--nw-accent); outline-offset:-2px; }
  /* The sky keeps its drawing size and shrinks as one block: clouds, sun and rain stay in proportion. */
  .sky { position:absolute; top:0; right:0; z-index:-2; width:calc(100% / var(--k)); height:calc(100% / var(--k)); transform:scale(var(--k)); transform-origin:top right; pointer-events:none; }
  .nw-tilecard .sky { --k:.5; --nw-orb-x:calc(100% - 370px); }
  .veil { position:absolute; inset:0; z-index:-1; pointer-events:none; }
  .nw-tilecard .veil { background:linear-gradient(90deg, var(--nw-bg) 0%, color-mix(in srgb, var(--nw-bg) 96%, transparent) 18%,
    color-mix(in srgb, var(--nw-bg) 70%, transparent) 30%, color-mix(in srgb, var(--nw-bg) 30%, transparent) 46%, transparent 64%); }
  .nw-tilecard.open .veil { background:linear-gradient(90deg, var(--nw-bg) 0%, color-mix(in srgb, var(--nw-bg) 92%, transparent) 30%, color-mix(in srgb, var(--nw-bg) 40%, transparent) 60%, transparent 85%),
    linear-gradient(0deg, var(--nw-bg) 0%, color-mix(in srgb, var(--nw-bg) 70%, transparent) 30%, transparent 60%); }
  .top { display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-areas:"meta now" "brief now"; column-gap:14px; row-gap:8px; padding:14px 16px; align-items:center; }
  .quiet .top { grid-template-areas:"meta now"; }
  .meta { grid-area:meta; align-self:start; display:flex; flex-direction:column; align-items:flex-start; gap:6px; min-width:0; }
  .place { font-size:var(--nw-fs-small); color:var(--nw-fg2); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .brief { grid-area:brief; min-width:0; min-height:38px; }
  .quiet .brief { display:none; }
  /* Anchored at the top: it does not move when the left column grows as the tile unfolds. */
  .top .nw-now { grid-area:now; align-self:start; position:relative; }
  /* The source fades in under the temperature, out of the flow: nothing moves. */
  .top .nw-now .nw-badge { position:absolute; top:100%; right:0; max-width:none; margin-top:6px; opacity:0; transform:translateY(-4px); transition:opacity .3s .15s, transform .3s .15s; pointer-events:none; }
  .open .top .nw-now .nw-badge { opacity:1; transform:none; }
  /* Folded, extra alerts wait in the scrolling bubble; unfolded, they open gently under the first one. */
  .reveal { display:grid; grid-template-rows:0fr; margin-top:-6px; opacity:0;
    transition:grid-template-rows var(--nw-expand) var(--nw-ease), margin-top var(--nw-expand) var(--nw-ease), opacity .3s .1s; }
  .reveal > div { min-height:0; overflow:clip; overflow-clip-margin:18px; }
  .open .reveal { grid-template-rows:1fr; margin-top:0; opacity:1; }
  /* The unfolding part: the height animates with grid-template-rows, no measuring in script. */
  /* Folded, the hidden part is not drawn at all (visibility waits for the end of the folding): its glass costs nothing on a phone. */
  .more { display:grid; grid-template-rows:0fr; visibility:hidden; transition:grid-template-rows var(--nw-expand) var(--nw-ease), visibility 0s linear var(--nw-expand); }
  .open .more { grid-template-rows:1fr; visibility:visible; transition:grid-template-rows var(--nw-expand) var(--nw-ease), visibility 0s; }
  .more > div { overflow:hidden; min-height:0; }
  .more-in { padding:0 16px 14px; display:flex; flex-direction:column; gap:12px; opacity:0; transform:translateY(-6px); transition:opacity .3s .1s, transform .3s .1s; }
  .open .more-in { opacity:1; transform:none; }
  .headline { margin:0; font-size:var(--nw-fs-text); font-weight:600; line-height:1.45; max-width:56ch; }
  .moments, .hours, .days { display:grid; gap:var(--nw-gap); }
  .moments { grid-template-columns:repeat(4, minmax(0,1fr)); }
  .days { grid-template-columns:repeat(5, minmax(0,1fr)); }
  .hours { grid-auto-flow:column; grid-auto-columns:minmax(64px,1fr); overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
  .hours .nw-tile, .days .nw-tile { grid-template-columns:1fr; justify-items:center; text-align:center; padding:9px 6px; }
  .hours .nw-tile strong, .days .nw-tile strong { font-size:var(--nw-fs-text); }
  .days .lo { font-size:var(--nw-fs-small); font-weight:600; color:var(--nw-fg2); }
  .section-title { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .seg { display:inline-flex; padding:2px; border-radius:var(--nw-radius-pill); border:1px solid var(--nw-line); background:var(--nw-glass); }
  .seg button { font-size:var(--nw-fs-small); line-height:1; font-weight:600; border:0; background:none; color:var(--nw-fg2); padding:5px 10px; border-radius:var(--nw-radius-pill); cursor:pointer; }
  .seg button[aria-pressed=true] { background:var(--nw-bg); color:var(--nw-fg); box-shadow:0 1px 3px #0002; }
  .foot { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px 10px; font-size:var(--nw-fs-small); color:var(--nw-fg2); }
  .grabber { display:flex; justify-content:center; padding:0 0 8px; }
  .grabber i { width:34px; height:4px; border-radius:4px; background:var(--nw-line); }
  .open .grabber { display:none; }
  /* Long press: a ring fills up under the finger. */
  .nw-tilecard.pressing { box-shadow:inset 0 0 0 3px color-mix(in srgb, var(--nw-accent) 45%, transparent); }
  .press-ring { position:absolute; width:44px; height:44px; margin:-22px 0 0 -22px; border-radius:50%; pointer-events:none; opacity:0;
    background:conic-gradient(var(--nw-accent) calc(var(--p, 0) * 1turn), transparent 0);
    -webkit-mask:radial-gradient(circle, transparent 15px, #000 16px); mask:radial-gradient(circle, transparent 15px, #000 16px); }
  .pressing .press-ring { opacity:.9; }
  @container (max-width:600px) { .moments { grid-template-columns:repeat(2, minmax(0,1fr)); } }
  @container (max-width:480px) {
    .top { grid-template-areas:"meta now" "brief brief"; }
    .nw-tilecard .sky { --k:.42; --nw-orb-x:calc(100% - 300px); }
    .days { grid-template-columns:repeat(5, minmax(58px,1fr)); overflow-x:auto; scrollbar-width:none; }
  }
  @media (prefers-reduced-motion:reduce) { .more, .more-in, .reveal, .top .nw-now .nw-badge { transition:none; } }
`;

// The tile: on the dashboard it is one band; a tap unfolds it in place (bulletin and timeline), a long press opens the full card.
import { css, html, nothing, type TemplateResult } from 'lit';
import type { WeatherView } from '../view';
import { alertPill, label, nf, unbroken } from '../ui/parts';
import '../ui/ticker';
import '../ui/frise';

export interface TileState {
  open: boolean;
  /** What a long press opens: the full card over the page, or the user's weather page. */
  holdTarget: 'card' | 'page';
}

/** « En ce moment »: condition, temperature, then the source. Shared by the tile and the banner. */
export function nowBlock(v: WeatherView, kicker: boolean, extra: unknown = nothing): TemplateResult {
  const n = v.now;
  return html`<div class="nw-now">${kicker ? label('En ce moment') : nothing}
    <span class="cond" data-entity=${n.conditionEntity ?? nothing} title=${n.source}><ha-icon icon=${n.icon}></ha-icon>${n.label}</span>
    ${n.temperature === undefined ? html`<span class="cond">Température indisponible</span>`
      : html`<span class="temp" data-entity=${n.temperatureEntity ?? nothing} aria-label=${`${n.temperatureSource} : ${nf(n.temperature)} degrés Celsius`}>${nf(n.temperature)}<small>°C</small></span>`}
    ${extra}<span class="nw-badge">${n.temperatureSource}</span></div>`;
}

/** The timeline of the coming hours: the brief's points, the measured alert, the vigilance and the forecast sky. Shared with the banner. */
export const frise = (v: WeatherView) => v.points.length || v.alerts.length || v.hours.length
  ? html`<niak-frise class="nw-frise" .points=${v.points} .alerts=${v.alerts} .hours=${v.hours}></niak-frise>` : nothing;

export function renderTile(v: WeatherView, sky: TemplateResult, s: TileState): TemplateResult {
  // The top keeps the official vigilance, one pill folded, the others opening under it. What the station measures leads the scrolling bubble,
  // in alert style, then the other vigilances; unfolded, the timeline takes over from the bubble.
  const official = v.alerts.filter(a => a.official), [first, ...more] = official;
  const points = [...v.alerts.filter(a => !a.official), ...more].map(a => ({ ...a, alert: true as const }));
  const ticker = [...points, ...v.points];
  const headline = v.bulletin?.summary;
  return html`<div class=${`nw-tilecard${s.open ? ' open' : ''}${v.now.darkSky ? ' dark-sky' : ''}${ticker.length ? '' : ' quiet'}`}
      role="button" tabindex="0" aria-expanded=${s.open}
      aria-label=${`Météo${v.location ? ` à ${v.location}` : ''} : appui pour ${s.open ? 'replier' : 'déplier'}, appui long pour ${s.holdTarget === 'page' ? 'la page météo' : 'la carte complète'}`}>
    <div class="sky" aria-hidden="true">${sky}</div><div class="veil" aria-hidden="true"></div><i class="press-ring" aria-hidden="true"></i>
    <div class="top">
      <div class="meta">${v.location ? html`<span class="place">${v.location}</span>` : nothing}${first ? alertPill(first) : nothing}
        ${more.map(a => html`<div class="reveal"><div>${alertPill(a)}</div></div>`)}</div>
      <div class="brief"><div><div>${ticker.length ? html`<niak-ticker .points=${ticker}></niak-ticker>` : nothing}</div></div></div>
      ${nowBlock(v, false)}
    </div>
    <div class="grabber" aria-hidden="true"><i></i></div>
    <div class="more" ?inert=${!s.open}><div><div class="more-in">
      ${headline ? html`<div class="bulletin">${label('Bulletin du jour')}<p class="headline">${unbroken(headline)}</p></div>` : nothing}
      ${frise(v)}
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
  /* Unfolded, the timeline has its own frosted glass: the veil keeps the text side, and the ground (puddles, snow) shows along the bottom. */
  .nw-tilecard.open .veil { background:linear-gradient(90deg, var(--nw-bg) 0%, color-mix(in srgb, var(--nw-bg) 92%, transparent) 30%, color-mix(in srgb, var(--nw-bg) 40%, transparent) 60%, transparent 85%); }
  .veil { -webkit-mask-image:linear-gradient(0deg, transparent 0, #000 14px); mask-image:linear-gradient(0deg, transparent 0, #000 14px); }
  .top { display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-areas:"meta now" "brief now"; column-gap:14px; row-gap:8px; padding:14px 16px; align-items:center; }
  .quiet .top { grid-template-areas:"meta now"; }
  .meta { grid-area:meta; align-self:start; display:flex; flex-direction:column; align-items:flex-start; gap:6px; min-width:0; }
  .place { font-size:var(--nw-fs-small); color:var(--nw-fg2); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .brief { grid-area:brief; min-width:0; min-height:38px; transition:min-height var(--nw-expand) var(--nw-ease); }
  .quiet .brief { display:none; }
  /* Unfolded, the scrolling bubble folds away: the timeline below shows the same points. */
  .brief > div { display:grid; grid-template-rows:1fr; transition:grid-template-rows var(--nw-expand) var(--nw-ease), opacity .25s; }
  .brief > div > div { min-height:0; overflow:clip; overflow-clip-margin:18px; }
  .open .brief { min-height:0; }
  .open .brief > div { grid-template-rows:0fr; opacity:0; }
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
  .bulletin { display:flex; flex-direction:column; gap:4px; }
  .headline { margin:0; font-size:var(--nw-fs-text); font-weight:600; line-height:1.45; max-width:62ch; }
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
  @container (max-width:480px) {
    .top { grid-template-areas:"meta now" "brief brief"; }
    .nw-tilecard .sky { --k:.42; --nw-orb-x:calc(100% - 300px); }
  }
  @media (prefers-reduced-motion:reduce) { .more, .more-in, .reveal, .brief, .brief > div, .top .nw-now .nw-badge { transition:none; } }
`;

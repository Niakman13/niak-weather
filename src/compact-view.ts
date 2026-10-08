import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { bulletinTiles, vigilanceText } from './banner-layouts';
import type { Bulletin } from './bulletin';
import type { CurrentWeather } from './current-weather';
import { tickerPoints, vigilanceBadge, type TickerPoint } from './compact-points';
import type { WeatherBrief } from './weather-brief';

/** Shows the points of the brief one at a time, every 5 s. Hovering or focusing the card pauses it. */
@customElement('niak-brief-ticker')
export class NiakBriefTicker extends LitElement {
  @property({ attribute: false }) points: TickerPoint[] = [];
  @state() private index = 0;
  @state() private leaving = false;
  private timer?: ReturnType<typeof setInterval>;
  private swap?: ReturnType<typeof setTimeout>;
  private key = '';
  connectedCallback() { super.connectedCallback(); this.timer = setInterval(() => this.next(), 5000); }
  disconnectedCallback() { super.disconnectedCallback(); clearInterval(this.timer); clearTimeout(this.swap); }
  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (!changed.has('points')) return;
    const key = this.points.map(p => p.text).join('|');
    if (key !== this.key) { this.key = key; this.index = 0; this.leaving = false; }
  }
  private next() {
    if (this.points.length < 2 || document.hidden || this.closest('.nw-compact, .nw-banner')?.matches(':hover, :focus-within')) return;
    const advance = () => { this.index = (this.index + 1) % this.points.length; this.leaving = false; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { advance(); return; }
    this.leaving = true; this.swap = setTimeout(advance, 350);
  }
  protected render() {
    const point = this.points[this.index % Math.max(1, this.points.length)];
    if (!point) return nothing;
    return html`<p class=${`chip chip--${point.group}${this.leaving ? ' out' : ''}`} aria-hidden="true">
        <ha-icon icon=${point.icon}></ha-icon><span class="kick">${point.label}</span><span class="msg">${point.text}</span></p>
      <ul class="sr">${this.points.map(p => html`<li>${p.label} : ${p.text}</li>`)}</ul>`;
  }
  static styles = css`
    :host { display:block; min-width:0; }
    /* Glass bubble, like the four bulletin tiles: icon, group label, sentence. Grey label and icon, as on the full card. */
    /* Label above the sentence: the sentence gets the whole width; the icon spans both lines. */
    .chip { display:inline-grid; grid-template-columns:auto minmax(0,1fr); column-gap:10px; row-gap:1px; align-items:center; max-width:100%; box-sizing:border-box; margin:0;
      padding:6px 14px 7px 10px; border-radius:14px; font-size:13px; line-height:16px; font-weight:500; color:var(--primary-text-color);
      background:linear-gradient(rgba(128,128,128,.07),rgba(128,128,128,.07)),color-mix(in srgb,var(--card-background-color,#fff) 38%,transparent);
      border:1px solid color-mix(in srgb,var(--primary-text-color,#253047) 13%,transparent); backdrop-filter:blur(3px) saturate(1.15);
      transition:opacity .35s ease, transform .35s ease; }
    .chip.out { opacity:0; transform:translateY(-5px); }
    ha-icon { --mdc-icon-size:18px; display:flex; line-height:0; grid-row:1 / 3; color:var(--secondary-text-color); }
    .kick { grid-column:2; font-size:9px; line-height:13px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; white-space:nowrap; color:var(--secondary-text-color); }
    .msg { grid-column:2; min-width:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; margin:0; padding:0; }
    /* Full-width tile: one line, so the tile keeps its height; the half-width tile reserves two. */
    @container (min-width:481px) { :host(.nw-c-ticker--tile) .msg { -webkit-line-clamp:1; } }
    @container (max-width:360px) {
      .chip { font-size:12px; }
    }
    @media (prefers-reduced-motion:reduce) { .chip { transition:none; } }
  `;
}

export interface CompactParts {
  format: 'intermediate' | 'tile'; brief?: WeatherBrief; now: CurrentWeather; bulletin?: Bulletin; sky: TemplateResult;
  location: string; dateLabel: string; path?: string; entity: string; language: string;
}

/** Intermediate (the banner alone) and tile formats. The whole card opens the weather page. */
export function renderCompact(p: CompactParts): TemplateResult {
  const vigilance = vigilanceBadge(p.brief), points = tickerPoints(p.brief);
  const dark = ['lightning', 'lightning-rainy', 'pouring'].includes(p.now.condition);
  const degrees = p.now.temperature === undefined ? undefined : new Intl.NumberFormat(p.language || 'fr', { maximumFractionDigits: 1 }).format(p.now.temperature);
  const now = html`<div class="nw-c-now">${p.format === 'intermediate' ? html`<span class="nw-c-kicker">En ce moment</span>` : nothing}
    <span class="nw-c-cond"><ha-icon icon=${p.now.icon}></ha-icon>${p.now.label}</span>
    ${degrees === undefined ? html`<span class="nw-c-missing">Température indisponible</span>` : html`<span class="nw-c-temp">${degrees}<small>°C</small></span>`}
    ${p.format === 'intermediate' ? html`<span class="nw-c-source">${p.now.temperatureSource}</span>` : nothing}</div>`;
  const ticker = points.length ? html`<niak-brief-ticker class=${`nw-c-ticker nw-c-ticker--${p.format}`} .points=${points}></niak-brief-ticker>` : nothing;
  const level = vigilance?.level ?? 1;
  const body = p.format === 'tile' ? html`
      <div class="nw-c-meta">${vigilance ? html`<span class=${`nw-c-vig nw-c-vig--level${level}`} title=${vigilance.label}><i><ha-icon icon="mdi:alert-outline"></ha-icon></i>${vigilanceText(vigilance.label)}</span>` : nothing}
        ${p.location ? html`<span class="nw-c-place">${p.location}</span>` : nothing}</div>
      ${ticker}${now}` : html`
      <header class="nw-c-head"><h2>Synthèse</h2><span>${[p.location, p.dateLabel].filter(Boolean).join(' · ')}</span></header>
      <div class="nw-c-main">${vigilance ? html`<div class=${`nw-b-vigil nw-b-vigil--level${level}`} role="status">
          <span class="nw-b-vigil-mark" aria-hidden="true"><i class="nw-b-vigil-halo"></i><ha-icon icon="mdi:alert-outline"></ha-icon></span>${vigilanceText(vigilance.label)}</div>` : nothing}
        ${ticker}</div>
      ${now}${p.bulletin ? bulletinTiles(p.bulletin) : nothing}`;
  return html`<div class=${`nw-compact nw-compact--${p.format}${dark ? ' nw-compact--dark-sky' : ''}${points.length ? '' : ' nw-compact--quiet'}`}
      role="link" tabindex="0" aria-label=${p.path ? 'Ouvrir la page météo' : 'Ouvrir la météo'} data-nav=${p.path ?? nothing} data-entity=${p.path ? nothing : p.entity}>
    <div class="nw-c-skybox" aria-hidden="true">${p.sky}</div><div class="nw-c-veil" aria-hidden="true"></div>${body}</div>`;
}

export const compactStyles = css`
  .nw-compact { position:relative; isolation:isolate; overflow:hidden; cursor:pointer; color:var(--primary-text-color); box-sizing:border-box; }
  .nw-compact:focus-visible { outline:2px solid var(--primary-color); outline-offset:-2px; }
  /* The sky keeps its drawing size and shrinks as one block: clouds, sun and rain stay in proportion. */
  .nw-c-skybox { position:absolute; top:0; right:0; z-index:-2; width:calc(100% / var(--k)); height:calc(100% / var(--k)); transform:scale(var(--k)); transform-origin:top right; pointer-events:none; }
  .nw-c-veil { position:absolute; inset:0; z-index:-1; pointer-events:none; background:linear-gradient(90deg,var(--card-background-color,#fff) 0%,
    color-mix(in srgb,var(--card-background-color,#fff) 96%,transparent) var(--v1,26%),color-mix(in srgb,var(--card-background-color,#fff) 70%,transparent) var(--v2,40%),
    color-mix(in srgb,var(--card-background-color,#fff) 30%,transparent) var(--v3,56%),transparent var(--v4,72%)); }
  .nw-c-now { display:flex; flex-direction:column; align-items:flex-end; text-align:right; gap:2px; text-shadow:0 0 10px var(--card-background-color,#fff),0 0 3px var(--card-background-color,#fff); }
  .nw-c-kicker { font-size:10px; text-transform:uppercase; letter-spacing:.12em; opacity:.85; }
  .nw-c-cond { display:flex; align-items:center; gap:6px; font-weight:650; font-size:15px; } .nw-c-cond ha-icon { --mdc-icon-size:20px; }
  .nw-c-temp { font-weight:700; letter-spacing:-1.5px; line-height:1.08; font-size:42px; }
  .nw-c-temp small { font-size:18px; font-weight:400; margin-left:3px; vertical-align:super; letter-spacing:0; }
  .nw-c-missing { font-size:13px; }
  .nw-c-source { font-size:10px; font-weight:600; padding:2px 9px; border-radius:999px; margin-top:3px; text-shadow:none;
    border:1px solid var(--divider-color,rgba(150,150,150,.3)); background:color-mix(in srgb,var(--card-background-color,#fff) 70%,transparent); }
  /* Storm and downpour clouds stay dark whatever the theme: their text stays white, as on the full card. */
  .nw-compact--dark-sky .nw-c-now { color:white; text-shadow:0 1px 5px #0b1a2b99; }
  .nw-compact--dark-sky .nw-c-source { color:white; background:rgba(15,40,65,.25); border-color:rgba(255,255,255,.28); }

  /* Intermediate: the banner alone. */
  .nw-compact--intermediate { --k:.78; --nw-orb-x:calc(100% - 330px); padding:18px 20px; min-height:260px; display:grid; grid-template-columns:minmax(0,1fr) auto;
    grid-template-areas:"head now" "main now" "tiles tiles"; grid-template-rows:auto 1fr auto; column-gap:18px; }
  .nw-c-head { grid-area:head; display:flex; align-items:baseline; gap:10px; min-width:0; }
  .nw-c-head h2 { margin:0; font-size:17px; font-weight:700; letter-spacing:-.2px; }
  .nw-c-head span { font-size:12px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .nw-c-main { grid-area:main; display:flex; flex-direction:column; align-items:flex-start; gap:12px; margin-top:14px; min-width:0; max-width:100%; }
  .nw-c-main .nw-b-vigil { margin:0; }
  .nw-compact--intermediate .nw-c-now { grid-area:now; align-self:start; }
  .nw-compact--intermediate .nw-b-tiles { grid-area:tiles; }
  /* Room for a two-line sentence: the day tiles below never jump when the bubble changes. */
  .nw-compact--intermediate .nw-c-ticker { max-width:100%; min-height:61px; }
  @container (max-width:520px) {
    .nw-compact--intermediate { --k:.62; grid-template-columns:minmax(0,1fr); grid-template-areas:"head" "now" "main" "tiles"; min-height:0; }
    .nw-compact--intermediate .nw-c-now { min-height:118px; justify-content:center; margin-top:6px; }
    .nw-c-main { margin-top:4px; }
  }

  /* Tile: one band of sky; at half width the brief moves under the temperature, two lines always reserved. */
  .nw-compact--tile { --k:.5; --nw-orb-x:calc(100% - 370px); --v1:18%; --v2:30%; --v3:46%; --v4:64%; display:grid; grid-template-columns:minmax(0,1fr) auto;
    grid-template-areas:"meta now" "txt now"; align-items:center; column-gap:14px; row-gap:8px; padding:14px 16px; min-height:92px; }
  .nw-c-meta { grid-area:meta; align-self:end; display:flex; align-items:center; gap:8px; min-width:0; }
  .nw-c-place { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .nw-compact--tile .nw-c-ticker { grid-area:txt; align-self:start; justify-self:start; max-width:100%; }
  .nw-compact--tile .nw-c-now { grid-area:now; }
  .nw-compact--tile .nw-c-temp { font-size:30px; letter-spacing:-1px; } .nw-compact--tile .nw-c-temp small { font-size:14px; }
  .nw-compact--tile .nw-c-cond { font-size:13px; } .nw-compact--tile .nw-c-cond ha-icon { --mdc-icon-size:17px; }
  .nw-compact--tile.nw-compact--quiet { grid-template-areas:"meta now"; }
  /* Nothing to scroll: the place on top, the vigilance under it, both in the top left corner. */
  .nw-compact--quiet .nw-c-meta { flex-direction:column; align-items:flex-start; align-self:start; gap:6px; }
  .nw-compact--quiet .nw-c-place { order:-1; }
  /* Vigilance: a small bubble in the official colour, plainer than the full card's pill. */
  .nw-c-vig { --al:232,184,20; flex:0 1 auto; min-width:0; max-width:100%; display:inline-flex; align-items:center; gap:6px; padding:3px 12px 3px 4px; border-radius:999px; font-size:12px; font-weight:650;
    background:linear-gradient(100deg,color-mix(in srgb,var(--card-background-color,#fff) 80%,rgb(var(--al)) 20%),color-mix(in srgb,var(--card-background-color,#fff) 92%,rgb(var(--al)) 8%));
    border:1px solid rgba(var(--al),.38); backdrop-filter:blur(8px); }
  .nw-c-vig--level2 { --al:238,124,30; } .nw-c-vig--level3 { --al:214,52,58; }
  .nw-c-vig i { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:none; background:rgba(var(--al),.16); border:1.5px solid rgba(var(--al),.6);
    color:color-mix(in srgb,rgb(var(--al)) 78%,var(--primary-text-color) 22%); box-sizing:border-box; }
  .nw-c-vig ha-icon { --mdc-icon-size:12px; }
  .nw-c-vig i { flex:none; } .nw-c-vig .nw-vigil-text small { font-size:8.5px; line-height:11px; }
  .nw-c-kicker { white-space:nowrap; }
  /* HA's ha-icon is inline: without this it takes a line height and sits high in its circle. */
  .nw-compact ha-icon { display:flex; line-height:0; }
  /* Phones and half width: the brief moves under the temperature, on the full width. */
  @container (max-width:480px) {
    .nw-compact--tile { --k:.42; --nw-orb-x:calc(100% - 300px); --v1:0%; --v2:12%; --v3:34%; --v4:60%; grid-template-areas:"meta now" "txt txt"; grid-template-rows:auto 62px;
      column-gap:10px; padding:12px 14px; }
    .nw-compact:not(.nw-compact--quiet) .nw-c-meta { align-self:center; } .nw-compact:not(.nw-compact--quiet) .nw-c-meta:has(.nw-c-vig) .nw-c-place { display:none; }
    .nw-compact--tile .nw-c-ticker { align-self:center; }
    .nw-compact--tile .nw-c-temp { font-size:26px; } .nw-compact--tile .nw-c-cond { font-size:12px; }
    .nw-compact--tile.nw-compact--quiet { grid-template-rows:auto; }
  }
`;

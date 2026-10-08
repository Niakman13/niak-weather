import { css, html, nothing, type TemplateResult } from 'lit';
import type { Bulletin } from './bulletin';
import type { AlertPoint } from './compact-points';
import type { WeatherBrief } from './weather-brief';
import { numberFormat } from './intl-cache';

export interface BannerParts {
  brief?: WeatherBrief; headline?: string;
  /** Vigilance, or the brief's most important point needing attention. */
  alert?: AlertPoint;
  /** The rotating brief bubble (Now / Coming), under the vigilance. */
  ticker: TemplateResult | typeof nothing;
  bulletin?: Bulletin; header: TemplateResult | typeof nothing; sky: TemplateResult; current: TemplateResult; dateLabel: string; rgb: string;
}

const temps = (p: Bulletin['periods'][number]) => p.tmin === undefined ? '' : p.tmin === p.tmax ? `${p.tmin} °C` : `${p.tmin}–${p.tmax} °C`;
const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

/** The banner: heading, vigilance pill, the bulletin's first sentence, Now / Coming chips and four see-through period tiles over the animated sky. */
export function renderBanner(p: BannerParts): TemplateResult {
  return html`<section id="heros" class="nw-section nw-synthesis nw-banner" aria-labelledby="nw-synthesis-title" style=${`--vc:${p.rgb}`}>
    ${p.sky}<header class="nw-section-heading nw-b-head">${p.header}<span class="nw-b-date">${p.dateLabel}</span></header>
    <div class="nw-b-main">
      ${p.bulletin ? html`<span class="nw-b-kicker">Bulletin du jour</span><h3 class="nw-b-headline">${firstSentence(p.bulletin.summary)}</h3>`
        : !p.alert && p.headline ? html`<h3 class="nw-b-headline">${p.headline}</h3>` : nothing}
      ${p.alert ? alertPill(p.alert) : nothing}
      ${p.ticker}
    </div>${p.current}
    ${p.bulletin ? bulletinTiles(p.bulletin) : nothing}
  </section>`;
}

/** Label in small capitals above the text ("Vigilance jaune" / "Orages", "Maintenant" / "Pluie forte"), like the brief bubbles. */
export function alertText(a: AlertPoint): TemplateResult {
  return html`<span class="nw-vigil-text">${a.label ? html`<small>${a.label}</small>` : nothing}<strong>${a.text}</strong></span>`;
}

/** The alert pill of the banner and the intermediate format, in the level's colour with its halo. */
export function alertPill(a: AlertPoint): TemplateResult {
  return html`<div class=${`nw-b-vigil nw-b-vigil--level${a.level}`} role="status">
    <span class="nw-b-vigil-mark" aria-hidden="true"><i class="nw-b-vigil-halo"></i><ha-icon icon=${a.icon}></ha-icon></span>${alertText(a)}</div>`;
}

/** The four parts of the day, see-through over the sky. Shared with the intermediate format. */
export function bulletinTiles(bulletin: Bulletin): TemplateResult {
  return html`<ol class="nw-b-tiles">${bulletin.periods.map(x => html`<li title=${x.text}>
      <span class="nw-b-when">${x.label}</span><ha-icon icon=${x.icon}></ha-icon><strong>${temps(x)}</strong>
      <span class="nw-b-sky">${x.phrase}</span>${x.rain >= 1 ? html`<span class="nw-b-rain">${numberFormat('fr-FR', { maximumFractionDigits: 1 }).format(x.rain)} mm</span>` : nothing}
      ${(x.wind ?? 0) >= 20 ? html`<span class="nw-b-wind">${x.wind} km/h${(x.gust ?? 0) >= 40 ? html` · raf. ${x.gust}` : nothing}</span>` : nothing}</li>`)}</ol>`;
}

export const bannerStyles = css`
  .nw-synthesis.nw-banner { display:grid; grid-template-columns:minmax(0,1fr) minmax(210px,.42fr); column-gap:24px; }
  .nw-banner>.nw-section-heading { grid-area:head; margin-bottom:14px; }
  .nw-banner .nw-b-main { grid-area:main; position:relative; z-index:1; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:10px; }
  .nw-banner .nw-current-weather { grid-area:aside; min-height:170px; align-self:center; }
  .nw-b-date { font-size:11px; color:var(--secondary-text-color); }
  .nw-b-date::first-letter { text-transform:uppercase; }
  /* The rotating brief bubble: two lines reserved so the day tiles never jump. */
  .nw-banner .nw-b-ticker { position:relative; z-index:1; max-width:100%; min-height:61px; }
  .nw-b-tiles { grid-area:tiles; list-style:none; margin:18px 0 0; padding:0; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; position:relative; z-index:1; }
  .nw-b-tiles li { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; align-content:start; column-gap:8px; row-gap:3px; padding:11px 13px; border-radius:14px;
    /* Light glass: the animated sky shows through, a soft blur keeps the text readable. */
    background:linear-gradient(rgba(128,128,128,.07),rgba(128,128,128,.07)),color-mix(in srgb,var(--card-background-color,#fff) 38%,transparent);
    border:1px solid color-mix(in srgb,var(--primary-text-color,#253047) 13%,transparent); backdrop-filter:blur(3px) saturate(1.15); }
  .nw-b-tiles li>:not(ha-icon):not(strong) { grid-column:1/-1; }
  .nw-b-tiles .nw-b-when { font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--secondary-text-color); }
  .nw-b-tiles ha-icon { --mdc-icon-size:26px; color:var(--primary-text-color); }
  .nw-b-tiles strong { font-size:17px; font-weight:750; letter-spacing:-.3px; white-space:nowrap; }
  .nw-b-tiles .nw-b-sky { font-size:12px; color:var(--primary-text-color); opacity:.85; }
  .nw-b-tiles .nw-b-rain, .nw-b-tiles .nw-b-wind { font-size:11px; font-weight:600; }
  .nw-b-rain { color:rgb(27,171,175); } .nw-b-wind { color:rgb(40,130,240); }
  /* The vigilance pill sits in the main column, under the bulletin and above the Now / Coming bubbles. */
  .nw-synthesis.nw-banner { grid-template-areas:"head aside" "main aside" "tiles tiles"; grid-template-rows:auto 1fr auto; }
  .nw-b-headline { margin:0; font-size:15px; font-weight:600; letter-spacing:-.1px; line-height:1.4; max-width:56ch; }
  /* Vigilance: a glass pill in the official colour, its icon glowing with the same halo as the alert emblem. */
  /* The alert has the brief bubble's shape (label above, icon across both lines); only its colour and halo set it apart. */
  .nw-b-vigil { --al:232,184,20; position:relative; z-index:2; display:inline-grid; grid-template-columns:auto minmax(0,1fr); column-gap:10px; align-items:center;
    max-width:100%; box-sizing:border-box; margin:2px 0 0; padding:6px 14px 7px 10px; border-radius:14px;
    background:linear-gradient(100deg,color-mix(in srgb,var(--card-background-color,#fff) 80%,rgb(var(--al)) 20%),color-mix(in srgb,var(--card-background-color,#fff) 92%,rgb(var(--al)) 8%));
    border:1px solid rgba(var(--al),.38); backdrop-filter:blur(8px); box-shadow:0 0 6px 0 rgba(var(--al),.22),0 4px 18px -10px rgba(var(--al),.5); }
  /* The breathing glow is a fixed shadow whose opacity pulses: the GPU animates it without repainting. */
  .nw-b-vigil::after { content:''; position:absolute; inset:-1px; border-radius:inherit; box-shadow:0 0 16px 2px rgba(var(--al),.42); opacity:0; animation:nwVigilGlow 5.2s ease-in-out infinite; pointer-events:none; z-index:-1; }
  .nw-b-vigil--level2 { --al:238,124,30; } .nw-b-vigil--level3 { --al:214,52,58; }
  .nw-vigil-text { display:flex; flex-direction:column; row-gap:1px; min-width:0; }
  .nw-vigil-text small { font-size:9px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; line-height:13px; white-space:nowrap; color:color-mix(in srgb,rgb(var(--al)) 62%,var(--primary-text-color) 38%); }
  .nw-vigil-text strong { font-size:13px; font-weight:600; line-height:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .nw-b-vigil-mark { position:relative; width:18px; height:18px; display:flex; align-items:center; justify-content:center; color:color-mix(in srgb,rgb(var(--al)) 85%,var(--primary-text-color) 15%); }
  .nw-b-vigil-mark ha-icon { --mdc-icon-size:18px; position:relative; z-index:1; display:flex; line-height:0; /* HA's ha-icon is inline and would sit low */ }
  .nw-b-vigil-halo { position:absolute; inset:-12px; border-radius:50%; background:radial-gradient(circle,rgba(var(--al),.3),rgba(var(--al),.1) 45%,rgba(var(--al),0) 75%); filter:blur(6px); animation:nwVigilHalo 5.2s ease-in-out infinite; pointer-events:none; }
  @keyframes nwVigilHalo { 0%,100% { opacity:.55; transform:scale(.94); } 50% { opacity:.9; transform:scale(1.08); } }
  /* The glowing halo around the whole bubble, breathing in the alert's colour. */
  @keyframes nwVigilGlow { 0%,100% { opacity:0; } 50% { opacity:1; } }
  @media (prefers-reduced-motion:reduce) { .nw-b-vigil::after, .nw-b-vigil-halo { animation:none; } }
  .nw-b-kicker { font-size:10px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--secondary-text-color); }
  @container (max-width:650px) {
    /* Order: heading, current weather, then the bulletin column (bulletin, vigilance, Now / Coming bubbles). */
    .nw-synthesis.nw-banner { grid-template-columns:minmax(0,1fr); grid-template-rows:auto; grid-template-areas:"head" "aside" "main" "tiles"; }
    .nw-b-headline { font-size:14px; }
    .nw-banner .nw-current-weather { min-height:130px; margin:0 0 10px; }
    .nw-b-tiles { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
  @container (max-width:360px) {
    /* Small phones: "22–23 °C" stays on one line inside its tile. */
    .nw-b-tiles li { padding:10px; column-gap:6px; } .nw-b-tiles ha-icon { --mdc-icon-size:20px; } .nw-b-tiles strong { font-size:14px; letter-spacing:-.4px; }
  }
`;

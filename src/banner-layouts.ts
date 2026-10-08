import { css, html, nothing, type TemplateResult } from 'lit';
import type { Bulletin } from './bulletin';
import type { BriefSignal, WeatherBrief } from './weather-brief';

export interface BannerParts {
  brief?: WeatherBrief; headline?: string; icon: string; attention: boolean; secondary: BriefSignal[];
  /** Severity of the leading point: 1 yellow, 2 orange, 3 red, as Météo-France vigilance colours. */
  level?: number;
  bulletin?: Bulletin; header: TemplateResult | typeof nothing; sky: TemplateResult; current: TemplateResult; dateLabel: string; rgb: string;
}

const groupLabel = (s: BriefSignal) => s.group === 'future' ? 'À venir' : s.group === 'environment' ? 'Environnement' : s.group === 'official' ? 'Vigilance' : 'Maintenant';
const temps = (p: Bulletin['periods'][number]) => p.tmin === undefined ? '' : p.tmin === p.tmax ? `${p.tmin} °C` : `${p.tmin}–${p.tmax} °C`;
const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

/** The banner: heading, vigilance pill, the bulletin's first sentence, Now / Coming chips and four see-through period tiles over the animated sky. */
export function renderBanner(p: BannerParts): TemplateResult {
  const chips = (signals: BriefSignal[]) => signals.length ? html`<ul class="nw-b-chips">${signals.map(s => html`<li class=${`nw-b-chip nw-b-chip--${s.group}`}><ha-icon icon=${s.icon}></ha-icon><b>${groupLabel(s)}</b><span>${s.text}</span></li>`)}</ul>` : nothing;
  const level = Math.min(3, Math.max(1, p.level ?? 1));
  return html`<section id="heros" class="nw-section nw-synthesis nw-banner" aria-labelledby="nw-synthesis-title" style=${`--vc:${p.rgb}`}>
    ${p.sky}<header class="nw-section-heading nw-b-head">${p.header}<span class="nw-b-date">${p.dateLabel}</span></header>
    ${p.attention ? html`<div class=${`nw-b-vigil nw-b-vigil--level${level}`} role="status">
      <span class="nw-b-vigil-mark" aria-hidden="true"><i class="nw-b-vigil-halo"></i><ha-icon icon=${p.icon}></ha-icon></span>
      <strong>${p.headline}</strong></div>` : nothing}
    <div class="nw-b-main">
      ${p.bulletin ? html`<span class="nw-b-kicker">Bulletin du jour</span><h3 class="nw-b-headline">${firstSentence(p.bulletin.summary)}</h3>`
        : !p.attention && p.headline ? html`<h3 class="nw-b-headline">${p.headline}</h3>` : nothing}
      ${chips(p.secondary)}
    </div>${p.current}
    ${p.bulletin ? html`<ol class="nw-b-tiles">${p.bulletin.periods.map(x => html`<li title=${x.text}>
      <span class="nw-b-when">${x.label}</span><ha-icon icon=${x.icon}></ha-icon><strong>${temps(x)}</strong>
      <span class="nw-b-sky">${x.phrase}</span>${x.rain >= 1 ? html`<span class="nw-b-rain">${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(x.rain)} mm</span>` : nothing}
      ${(x.wind ?? 0) >= 20 ? html`<span class="nw-b-wind">${x.wind} km/h${(x.gust ?? 0) >= 40 ? html` · raf. ${x.gust}` : nothing}</span>` : nothing}</li>`)}</ol>` : nothing}
  </section>`;
}

export const bannerStyles = css`
  .nw-synthesis.nw-banner { display:grid; grid-template-columns:minmax(0,1fr) minmax(210px,.42fr); column-gap:24px; }
  .nw-banner>.nw-section-heading { grid-area:head; margin-bottom:14px; }
  .nw-banner .nw-b-main { grid-area:main; position:relative; z-index:1; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:10px; }
  .nw-banner .nw-current-weather { grid-area:aside; min-height:170px; align-self:center; }
  .nw-b-date { font-size:11px; color:var(--secondary-text-color); }
  .nw-b-date::first-letter { text-transform:uppercase; }
  .nw-b-chips { list-style:none; margin:4px 0 0; padding:0; display:flex; flex-wrap:wrap; gap:8px; }
  .nw-b-chip { display:flex; align-items:center; gap:7px; padding:5px 11px 5px 8px; border-radius:999px; font-size:12px; line-height:1.3;
    background:color-mix(in srgb,var(--card-background-color,#fff) 78%,transparent); border:1px solid var(--divider-color,rgba(150,150,150,.25)); backdrop-filter:blur(6px); }
  .nw-b-chip ha-icon { --mdc-icon-size:15px; color:var(--secondary-text-color); }
  .nw-b-chip b { white-space:nowrap; font-weight:650; font-size:10px; letter-spacing:.4px; text-transform:uppercase; color:var(--secondary-text-color); }
  .nw-b-chip--official { border-color:rgba(230,125,45,.55); } .nw-b-chip--official ha-icon { color:rgb(230,125,45); }
  .nw-b-tiles { grid-area:tiles; list-style:none; margin:18px 0 0; padding:0; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; position:relative; z-index:1; }
  .nw-b-tiles li { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; align-content:start; column-gap:8px; row-gap:3px; padding:11px 13px; border-radius:14px;
    /* Light glass: the animated sky shows through, a soft blur keeps the text readable. */
    background:linear-gradient(rgba(128,128,128,.07),rgba(128,128,128,.07)),color-mix(in srgb,var(--card-background-color,#fff) 38%,transparent);
    border:1px solid color-mix(in srgb,var(--primary-text-color,#253047) 13%,transparent); backdrop-filter:blur(3px) saturate(1.15); box-shadow:inset 0 1px 0 rgba(255,255,255,.18); }
  .nw-b-tiles li>:not(ha-icon):not(strong) { grid-column:1/-1; }
  .nw-b-tiles .nw-b-when { font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--secondary-text-color); }
  .nw-b-tiles ha-icon { --mdc-icon-size:26px; color:var(--primary-text-color); }
  .nw-b-tiles strong { font-size:17px; font-weight:750; letter-spacing:-.3px; white-space:nowrap; }
  .nw-b-tiles .nw-b-sky { font-size:12px; color:var(--primary-text-color); opacity:.85; }
  .nw-b-tiles .nw-b-rain, .nw-b-tiles .nw-b-wind { font-size:11px; font-weight:600; }
  .nw-b-rain { color:rgb(27,171,175); } .nw-b-wind { color:rgb(40,130,240); }
  .nw-synthesis.nw-banner { grid-template-areas:"head aside" "vigil aside" "main aside" "tiles tiles"; grid-template-rows:auto auto 1fr auto; }
  .nw-b-headline { margin:0; font-size:15px; font-weight:600; letter-spacing:-.1px; line-height:1.4; max-width:56ch; }
  /* Vigilance: a glass pill in the official colour, its icon glowing with the same halo as the alert emblem. */
  .nw-b-vigil { --al:232,184,20; grid-area:vigil; justify-self:start; position:relative; z-index:2; display:flex; align-items:center; gap:12px; margin:0 0 16px; padding:7px 18px 7px 7px; border-radius:999px;
    background:linear-gradient(100deg,color-mix(in srgb,var(--card-background-color,#fff) 80%,rgb(var(--al)) 20%),color-mix(in srgb,var(--card-background-color,#fff) 92%,rgb(var(--al)) 8%));
    border:1px solid rgba(var(--al),.38); box-shadow:0 4px 18px -10px rgba(var(--al),.5); backdrop-filter:blur(8px); }
  .nw-b-vigil--level2 { --al:238,124,30; } .nw-b-vigil--level3 { --al:214,52,58; }
  .nw-b-vigil strong { font-size:14px; font-weight:650; letter-spacing:-.1px; }
  .nw-b-vigil-mark { position:relative; flex:0 0 32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%;
    color:color-mix(in srgb,rgb(var(--al)) 78%,var(--primary-text-color) 22%); background:radial-gradient(circle at 35% 25%,rgba(var(--al),.24),rgba(var(--al),.08)); border:1.5px solid rgba(var(--al),.6); animation:nwVigilGlow 5.2s ease-in-out infinite; }
  .nw-b-vigil-mark ha-icon { --mdc-icon-size:17px; position:relative; z-index:1; }
  .nw-b-vigil-halo { position:absolute; inset:-20px; border-radius:50%; background:radial-gradient(circle,rgba(var(--al),.22),rgba(var(--al),.08) 45%,rgba(var(--al),0) 75%); filter:blur(10px); animation:nwVigilHalo 5.2s ease-in-out infinite; pointer-events:none; }
  @keyframes nwVigilHalo { 0%,100% { opacity:.5; transform:scale(.94); } 50% { opacity:.85; transform:scale(1.08); } }
  @keyframes nwVigilGlow { 0%,100% { box-shadow:0 0 6px rgba(var(--al),.18); } 50% { box-shadow:0 0 12px rgba(var(--al),.32); } }
  @media (prefers-reduced-motion:reduce) { .nw-b-vigil-mark, .nw-b-vigil-halo { animation:none; } }
  .nw-b-kicker { font-size:10px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--secondary-text-color); }
  @container (max-width:650px) {
    /* Phone: the current weather sits on the sky, the text below it on the calm part of the banner. */
    .nw-synthesis.nw-banner { grid-template-columns:minmax(0,1fr); grid-template-rows:auto; grid-template-areas:"head" "vigil" "aside" "main" "tiles"; }
    .nw-b-headline { font-size:14px; }
    .nw-banner .nw-current-weather { min-height:150px; margin:0 0 14px; }
    .nw-b-tiles { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
`;

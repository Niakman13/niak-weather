import { css, html, nothing, type TemplateResult } from 'lit';
import type { Bulletin } from './bulletin';
import type { BriefSignal, WeatherBrief } from './weather-brief';

export type BannerLayout = 'classic' | 'editorial' | 'timeline' | 'focus';
export interface BannerParts {
  layout: Exclude<BannerLayout, 'classic'>;
  brief?: WeatherBrief; headline?: string; icon: string; attention: boolean; secondary: BriefSignal[];
  bulletin?: Bulletin; header: TemplateResult | typeof nothing; sky: TemplateResult; current: TemplateResult; dateLabel: string; rgb: string;
}

const groupLabel = (s: BriefSignal) => s.group === 'future' ? 'À venir' : s.group === 'environment' ? 'Environnement' : s.group === 'official' ? 'Vigilance' : 'Maintenant';
const temps = (p: Bulletin['periods'][number]) => p.tmin === undefined ? '' : p.tmin === p.tmax ? `${p.tmin} °C` : `${p.tmin}–${p.tmax} °C`;
const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

/** Alternative banners under evaluation: the bulletin and the brief arranged three ways over the animated sky. */
export function renderBanner(p: BannerParts): TemplateResult {
  const chips = (signals: BriefSignal[]) => signals.length ? html`<ul class="nw-b-chips">${signals.map(s => html`<li class=${`nw-b-chip nw-b-chip--${s.group}`}><ha-icon icon=${s.icon}></ha-icon><b>${groupLabel(s)}</b><span>${s.text}</span></li>`)}</ul>` : nothing;
  const pill = p.attention && p.brief ? html`<span class="nw-attention"><i aria-hidden="true"></i>${p.brief.label}</span>` : nothing;
  const periods = (cls: string) => p.bulletin ? html`<ol class=${cls}>${p.bulletin.periods.map(x => html`<li title=${x.text}>
    <span class="nw-b-when">${x.label}</span><ha-icon icon=${x.icon}></ha-icon><strong>${temps(x)}</strong>
    <span class="nw-b-sky">${x.phrase}</span>${x.rain >= 1 ? html`<span class="nw-b-rain">${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(x.rain)} mm</span>` : nothing}
    ${(x.wind ?? 0) >= 20 ? html`<span class="nw-b-wind">${x.wind} km/h${(x.gust ?? 0) >= 40 ? html` · raf. ${x.gust}` : nothing}</span>` : nothing}</li>`)}</ol>` : nothing;
  // Without an attention point the bulletin itself becomes the headline.
  const title = p.attention ? p.headline : p.bulletin ? firstSentence(p.bulletin.summary) : p.headline;
  const rest = p.bulletin ? (p.attention ? p.bulletin.summary : p.bulletin.summary.slice(firstSentence(p.bulletin.summary).length).trim()) : '';

  if (p.layout === 'editorial') return html`<section id="heros" class="nw-section nw-synthesis nw-banner nw-banner--editorial" aria-labelledby="nw-synthesis-title" style=${`--vc:${p.rgb}`}>
    ${p.sky}<header class="nw-section-heading nw-b-head">${p.header}<span class="nw-b-date">${p.dateLabel}</span></header>
    <div class="nw-b-main">
      <div class="nw-b-title">${p.attention ? html`<span class="nw-b-mark"><ha-icon icon=${p.icon}></ha-icon></span>` : nothing}<h3>${title}</h3></div>${pill}
      ${rest ? html`<p class="nw-b-text">${p.attention ? html`<b>Le temps : </b>` : nothing}${rest}</p>` : nothing}
      ${chips(p.secondary)}
    </div>${p.current}</section>`;

  if (p.layout === 'timeline') return html`<section id="heros" class="nw-section nw-synthesis nw-banner nw-banner--timeline" aria-labelledby="nw-synthesis-title" style=${`--vc:${p.rgb}`}>
    ${p.sky}<header class="nw-section-heading nw-b-head">${p.header}<span class="nw-b-date">${p.dateLabel}</span></header>
    <div class="nw-b-main">
      <div class="nw-b-title">${p.attention ? html`<span class="nw-b-mark"><ha-icon icon=${p.icon}></ha-icon></span>` : nothing}<h3>${title}</h3></div>${pill}
      ${chips(p.secondary)}
    </div>${p.current}
    ${periods('nw-b-tiles')}</section>`;

  return html`<section id="heros" class="nw-section nw-synthesis nw-banner nw-banner--focus" aria-labelledby="nw-synthesis-title" style=${`--vc:${p.rgb}`}>
    ${p.sky}
    ${p.attention ? html`<div class="nw-b-alert" role="status"><ha-icon icon=${p.icon}></ha-icon><strong>${p.headline}</strong>${pill}${p.secondary.length ? html`<span class="nw-b-more">${p.secondary.map(s => s.text).join(' · ')}</span>` : nothing}</div>` : nothing}
    <header class="nw-section-heading nw-b-head">${p.header}<span class="nw-b-date">${p.dateLabel}</span></header>
    <div class="nw-b-main">
      <span class="nw-b-kicker">Bulletin du jour</span>
      ${p.bulletin ? html`<p class="nw-b-lead">${p.bulletin.summary}</p>` : html`<h3>${p.headline ?? ''}</h3>`}
      ${periods('nw-b-strip')}
      ${!p.attention ? chips(p.secondary) : nothing}
    </div>${p.current}</section>`;
}

export const bannerStyles = css`
  .nw-synthesis.nw-banner { display:grid; grid-template-columns:minmax(0,1fr) minmax(210px,.42fr); grid-template-areas:"head aside" "main aside" "tiles tiles"; grid-template-rows:auto 1fr auto; column-gap:24px; }
  .nw-banner>.nw-section-heading { grid-area:head; margin-bottom:14px; }
  .nw-banner .nw-b-main { grid-area:main; position:relative; z-index:1; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:10px; }
  .nw-banner .nw-current-weather { grid-area:aside; min-height:170px; align-self:center; }
  .nw-banner--focus.nw-synthesis { grid-template-areas:"alert alert" "head aside" "main aside"; grid-template-rows:auto auto 1fr; }
  .nw-b-date { font-size:11px; color:var(--secondary-text-color); }
  .nw-b-date::first-letter { text-transform:uppercase; }
  .nw-b-title { display:flex; align-items:flex-start; gap:12px; }
  .nw-b-title h3 { margin:0; font-size:23px; font-weight:750; letter-spacing:-.5px; line-height:1.25; max-width:34ch; }
  .nw-b-mark { flex:0 0 40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; background:rgba(var(--vc),.14); color:rgb(var(--vc)); border:1px solid rgba(var(--vc),.35); }
  .nw-b-mark ha-icon { --mdc-icon-size:22px; }
  .nw-b-text { margin:2px 0 0; font-size:14px; line-height:1.6; color:var(--primary-text-color); opacity:.86; max-width:62ch; }
  .nw-b-text b { font-weight:650; opacity:1; }
  .nw-b-chips { list-style:none; margin:4px 0 0; padding:0; display:flex; flex-wrap:wrap; gap:8px; }
  .nw-b-chip { display:flex; align-items:center; gap:7px; padding:5px 11px 5px 8px; border-radius:999px; font-size:12px; line-height:1.3;
    background:color-mix(in srgb,var(--card-background-color,#fff) 78%,transparent); border:1px solid var(--divider-color,rgba(150,150,150,.25)); backdrop-filter:blur(6px); }
  .nw-b-chip ha-icon { --mdc-icon-size:15px; color:var(--secondary-text-color); }
  .nw-b-chip b { font-weight:650; font-size:10px; letter-spacing:.4px; text-transform:uppercase; color:var(--secondary-text-color); }
  .nw-b-chip--official { border-color:rgba(230,125,45,.55); } .nw-b-chip--official ha-icon { color:rgb(230,125,45); }
  /* Timeline: four glass tiles along the bottom of the sky. */
  .nw-b-tiles { grid-area:tiles; list-style:none; margin:18px 0 0; padding:0; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; position:relative; z-index:1; }
  .nw-b-tiles li { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; column-gap:8px; row-gap:3px; padding:11px 13px; border-radius:14px;
    background:color-mix(in srgb,var(--card-background-color,#fff) 72%,transparent); border:1px solid var(--divider-color,rgba(150,150,150,.25)); backdrop-filter:blur(10px); }
  .nw-b-tiles li>:not(ha-icon):not(strong) { grid-column:1/-1; }
  .nw-b-tiles .nw-b-when { font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--secondary-text-color); }
  .nw-b-tiles ha-icon { --mdc-icon-size:26px; color:var(--primary-text-color); }
  .nw-b-tiles strong { font-size:17px; font-weight:750; letter-spacing:-.3px; white-space:nowrap; }
  .nw-b-tiles .nw-b-sky { font-size:12px; color:var(--primary-text-color); opacity:.85; }
  .nw-b-tiles .nw-b-rain, .nw-b-tiles .nw-b-wind { font-size:11px; font-weight:600; }
  .nw-b-rain { color:rgb(27,171,175); } .nw-b-wind { color:rgb(40,130,240); }
  /* Focus: a slim alert bar, then the bulletin as the main text. */
  .nw-b-alert { grid-area:alert; position:relative; z-index:2; display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; margin:-6px 0 16px; padding:10px 14px; border-radius:12px;
    background:color-mix(in srgb,var(--card-background-color,#fff) 80%,rgb(var(--vc)) 20%); border:1px solid rgba(var(--vc),.5); }
  .nw-b-alert>ha-icon { --mdc-icon-size:20px; color:rgb(var(--vc)); }
  .nw-b-alert strong { font-size:14px; font-weight:700; }
  .nw-b-alert .nw-attention { padding:3px 9px; }
  .nw-b-more { flex-basis:100%; font-size:12px; color:var(--secondary-text-color); padding-left:32px; }
  .nw-b-kicker { font-size:10px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--secondary-text-color); }
  .nw-b-lead { margin:0; font-size:17px; line-height:1.55; font-weight:500; max-width:56ch; }
  .nw-b-strip { list-style:none; margin:6px 0 0; padding:0; display:flex; flex-wrap:wrap; gap:6px 18px; }
  .nw-b-strip li { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--secondary-text-color); }
  .nw-b-strip ha-icon { --mdc-icon-size:18px; color:var(--primary-text-color); }
  .nw-b-strip .nw-b-when { font-weight:650; color:var(--primary-text-color); }
  .nw-b-strip strong { font-weight:650; color:var(--primary-text-color); }
  .nw-b-strip .nw-b-sky { display:none; }
  @container (max-width:650px) {
    /* Phone: the current weather sits on the sky, the text below it on the calm part of the banner. */
    .nw-synthesis.nw-banner { grid-template-columns:minmax(0,1fr); grid-template-rows:auto; grid-template-areas:"head" "aside" "main" "tiles"; }
    .nw-banner--focus.nw-synthesis { grid-template-areas:"alert" "head" "aside" "main"; }
    .nw-banner .nw-current-weather { min-height:150px; margin:0 0 14px; }
    .nw-b-title h3 { font-size:20px; }
    .nw-b-lead { font-size:15px; }
    .nw-b-tiles { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
`;

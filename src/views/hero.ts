// The banner of the full card: the same pieces as the tile, at full size, over the animated sky.
import { css, html, nothing, type TemplateResult } from 'lit';
import type { WeatherView } from '../engine/view-model';
import { alertBubble, bubble, info, label, nf, tint } from '../ui/parts';
import { firstSentence, moments, nowBlock } from './tile';
import '../ui/ticker';

const GROUPS = [
  { key: 'official', title: 'Vigilance officielle' },
  { key: 'now', title: 'Maintenant' },
  { key: 'future', title: 'À venir' },
  { key: 'environment', title: 'Air et pollens' },
] as const;

/** The « i » of the banner: what the brief is, then every point it weighed, by group, with a link to its source. */
function briefInfo(v: WeatherView, uid: string): TemplateResult {
  const brief = v.brief;
  const groups = brief ? GROUPS.map(g => ({ ...g, signals: brief.signals.filter(s => s.group === g.key && (s.severity > 0 || v.points.some(p => p.text === s.text))) }))
    .filter(g => g.signals.length) : [];
  return info(`${uid}-brief`, {
    title: 'Synthèse',
    text: html`La météo du jour en une phrase, avec ce qui compte maintenant et ce qui arrive.
      ${groups.map(g => html`<div class="brief-group">${label(g.title)}<ul>${g.signals.map(s => html`<li data-entity=${s.entity ?? nothing}>
        <ha-icon icon=${s.icon}></ha-icon><span>${s.text}</span></li>`)}</ul></div>`)}
      ${brief?.caveats.length ? html`<div class="brief-group">${label('À vérifier')}<ul>${brief.caveats.map(c => html`<li><ha-icon icon="mdi:alert-circle-outline"></ha-icon><span>${c}</span></li>`)}</ul></div>` : nothing}`,
    example: '« Pluie ce soir, puis éclaircies demain matin. »',
  });
}

export function renderHero(v: WeatherView, sky: TemplateResult, uid: string): TemplateResult {
  const trend = v.now.trend === undefined ? nothing : html`<span class="nw-chip" style=${tint(v.now.trend > 0 ? 'heat' : 'cold')}
    title=${v.now.trend > 0 ? 'La température monte' : 'La température baisse'}><ha-icon icon=${v.now.trend > 0 ? 'mdi:arrow-top-right' : 'mdi:arrow-bottom-right'}></ha-icon>${v.now.trend > 0 ? '+' : '−'}${nf(Math.abs(v.now.trend))} °C/h</span>`;
  const season = v.season.news ? html`<span class="nw-chip" style=${tint('calm')} title=${v.season.tip}><ha-icon icon=${v.season.info.icon}></ha-icon>${v.season.news}</span>` : nothing;
  const headline = v.bulletin ? firstSentence(v.bulletin.summary) : v.alerts.length ? undefined : v.points[0]?.text;
  const points = v.bulletin || v.alerts.length ? v.points : v.points.slice(1);
  return html`<section class=${`nw-hero${v.now.darkSky ? ' dark-sky' : ''}`} aria-label="Synthèse">
    <div class="sky" aria-hidden="true">${sky}</div><div class="veil" aria-hidden="true"></div>
    <header class="fm-head"><h2>Synthèse</h2>${briefInfo(v, uid)}<span>${[v.location, v.dateLabel].filter(Boolean).join(' · ')}</span>${season}</header>
    <div class="hero-main">
      ${v.bulletin ? label('Bulletin du jour') : nothing}${headline ? html`<p class="headline">${headline}</p>` : nothing}
      ${v.alerts.map(a => alertBubble(a))}
      ${points.length > 1 ? html`<niak-ticker .points=${points}></niak-ticker>` : points.length ? bubble(points[0]) : nothing}
    </div>
    ${nowBlock(v, true, trend)}
    ${v.bulletin ? moments(v.bulletin) : nothing}
  </section>`;
}

export const heroStyles = css`
  .nw-hero { position:relative; isolation:isolate; overflow:hidden; padding:20px 24px 24px; display:grid; grid-template-columns:minmax(0,1fr) auto;
    grid-template-areas:"head now" "main now" "tiles tiles"; column-gap:24px; row-gap:12px; color:var(--nw-fg); }
  .nw-hero .sky { --k:1; }
  .nw-hero .veil { background:linear-gradient(90deg, var(--nw-bg) 0%, color-mix(in srgb, var(--nw-bg) 92%, transparent) 30%,
    color-mix(in srgb, var(--nw-bg) 45%, transparent) 55%, transparent 78%), linear-gradient(0deg, var(--nw-bg) 0%, transparent 40%); }
  .nw-hero > .fm-head { grid-area:head; cursor:default; flex-wrap:wrap; }
  .hero-main { grid-area:main; display:flex; flex-direction:column; align-items:flex-start; gap:10px; min-width:0; }
  .hero-main niak-ticker { max-width:100%; }
  .nw-hero .headline { margin:0; font-size:var(--nw-fs-text); font-weight:600; line-height:1.45; max-width:56ch; }
  .nw-hero > .nw-now { grid-area:now; align-self:start; gap:4px; }
  .nw-hero > .nw-now .temp { font-size:var(--nw-fs-temp); }
  .nw-hero > .moments { grid-area:tiles; margin-top:6px; gap:12px; }
  .brief-group { margin-top:10px; }
  .brief-group ul { list-style:none; margin:4px 0 0; padding:0; display:grid; gap:4px; }
  .brief-group li { display:flex; align-items:flex-start; gap:7px; font-size:var(--nw-fs-small); }
  .brief-group li ha-icon { --mdc-icon-size:15px; color:var(--nw-fg2); margin-top:1px; }
  @container (max-width:650px) {
    .nw-hero { grid-template-columns:minmax(0,1fr); grid-template-areas:"head" "now" "main" "tiles"; padding:16px 14px 18px; }
    .nw-hero > .moments { grid-template-columns:repeat(2, minmax(0,1fr)); }
  }
`;

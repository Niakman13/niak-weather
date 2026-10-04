import { css, html, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { briefPreview } from './brief-preview';
import { renderAtmo } from './atmo-view';
import type { WeatherBrief } from './weather-brief';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from './types';

export function renderDashboard(rendered: Record<string, string>, brief: WeatherBrief | undefined, model: HassEntity,
  hass: HomeAssistant, config: WeatherCardConfig, now: Date, location: string) {
  const preview = brief ? briefPreview(brief) : undefined;
  const compact = config.mode === 'compact';
  const unavailable = ['unknown', 'unavailable'].includes(model.state);
  const condition = unavailable ? 'Météo indisponible' : String(model.attributes.titre || 'Votre météo');
  const headline = preview?.selected[0]?.group === 'official' ? brief!.title : preview?.selected[0]?.text ?? (brief && !brief.available ? 'Données insuffisantes' : condition);
  const current = unavailable ? 'Mesures indisponibles.' : brief?.summary.split('\n')[0].replace(/^Maintenant : /, '').split('. ')[0];
  return html`
    <section id="heros" class="nw-section nw-synthesis" aria-labelledby="nw-synthesis-title" style=${`--vc:${brief?.rgb ?? '61,155,233'}`}>
      <header class="nw-section-heading"><h2 id="nw-synthesis-title">Synthèse</h2><span>${location}</span>
        ${brief ? html`<span class="nw-attention"><i></i>${brief.label}</span>` : nothing}</header>
      <div class="nw-summary-emblem me-bulle" aria-hidden="true"><div class="me-halo"></div>
        <div class="me-rond"><ha-icon icon=${brief?.icon ?? 'mdi:weather-partly-cloudy'}></ha-icon></div></div>
      <div class="nw-summary-lead"><h3>${headline}</h3></div>
      <div class="nw-summary-lines">
        ${preview?.selected.length ? preview.selected.slice(1).map(s => html`<p><span>${s.group === 'future' ? 'À venir' : s.group === 'environment' ? 'Environnement' : s.group === 'official' ? 'Vigilance' : 'Maintenant'}</span>${s.text}</p>`)
          : html`<p>${current || String(model.attributes.sous_titre || 'Choisissez vos sources météo.')}</p>`}
        ${brief && !preview?.selected.some(s => s.group === 'future') ? html`<p><span>À venir</span>${brief.signals.find(s => s.group === 'future')?.text ?? (brief.caveats.some(c => c.startsWith('Prévisions des')) ? 'Prévisions indisponibles.' : 'Pas de signal marqué dans les 6 h disponibles.')}</p>` : nothing}
      </div>
      ${brief ? html`<details class="nw-brief-details"><summary>Comprendre la synthèse${preview?.remaining ? ` · ${preview.remaining} autre${preview.remaining > 1 ? 's' : ''} point${preview.remaining > 1 ? 's' : ''} important${preview.remaining > 1 ? 's' : ''}` : ''}</summary>
        <p>${brief.summary.split('\n')[0]}</p>
        <p>La couleur retient le niveau d’attention le plus élevé. Les seuils de la carte ne sont pas des vigilances officielles.</p>
        ${brief.signals.map(s => html`<p><strong>${s.text}</strong> — ${s.explanation}${s.entity ? html` <button data-entity=${s.entity}>Voir la source</button>` : nothing}</p>`)}
        ${brief.caveats.map(c => html`<p class="nw-brief-caveat">${c}</p>`)}</details>` : nothing}
    </section>
    <section id="today" class="nw-section" aria-labelledby="nw-today-title" style="--vc:61,155,233">
      <header class="nw-section-heading"><h2 id="nw-today-title">Aujourd’hui</h2><span>Mesures et ressenti</span></header>
      <div id="comfort">${rendered.comfort ? unsafeHTML(rendered.comfort) : html`<p class="nw-empty">Ressenti indisponible</p>`}</div>
      <div id="tuiles">${unsafeHTML(rendered.tuiles)}</div>
      ${!compact && rendered.bilan ? html`<details open class="nw-measure-details"><summary>Détails pluie et vent</summary><div id="bilan">${unsafeHTML(rendered.bilan)}</div></details>` : nothing}
      ${!compact ? html`<div id="pastilles">${unsafeHTML(rendered.pastilles)}</div>` : nothing}
      ${renderAtmo(hass, config, now, 'today')}
    </section>
    ${compact ? nothing : html`<section id="predictions" class="nw-section" aria-labelledby="nw-predictions-title">
      <header class="nw-section-heading"><h2 id="nw-predictions-title">Prévisions</h2><span>${config.forecast_source ?? (/france/i.test(String(hass.states[config.weather_entity]?.attributes.attribution)) ? 'Météo-France' : 'Prévisions météo')}</span></header>
      <div class="nw-forecast-grid"><div id="courbe">${unsafeHTML(rendered.courbe)}</div><div id="jours">${unsafeHTML(rendered.jours)}</div></div>
      ${renderAtmo(hass, config, now, 'tomorrow')}
    </section>`}`;
}

export const dashboardStyles = css`
  #container { display:block; }
  .nw-section { padding:20px 22px; border-top:1px solid var(--divider-color,rgba(150,150,150,.18)); color:var(--primary-text-color); }
  .nw-section:first-child { border-top:0; }
  .nw-section-heading { display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; margin-bottom:18px; }
  .nw-section-heading h2 { font-size:13px; font-weight:750; margin:0; letter-spacing:.01em; }
  .nw-section-heading>span { font-size:11px; color:var(--secondary-text-color); }
  .nw-section-heading .nw-attention { display:flex; align-items:center; gap:6px; margin-left:auto; font-size:10px; }
  .nw-attention i { width:7px; height:7px; border-radius:50%; background:rgb(var(--vc)); }
  .nw-synthesis { display:grid; grid-template-columns:76px minmax(0,1fr); column-gap:20px; border-left:3px solid rgb(var(--vc)); background:linear-gradient(90deg,rgba(var(--vc),.065),transparent 65%); }
  .nw-synthesis>.nw-section-heading { grid-column:1 / -1; }
  .nw-summary-emblem { grid-column:1; grid-row:2 / span 3; align-self:start; margin-top:3px; width:76px; height:76px; pointer-events:none; }
  .nw-synthesis .me-rond { background:radial-gradient(circle at 35% 25%,rgba(var(--vc),.22),rgba(var(--vc),.07)); animation:meRespire 4.2s ease-in-out infinite; }
  .nw-synthesis .me-halo { inset:-16px; opacity:.5; animation:nwHalo 5.2s ease-in-out infinite; }
  @keyframes nwHalo { 0%,100% { opacity:.35; transform:scale(.94); } 50% { opacity:.65; transform:scale(1.1); } }
  .nw-summary-lead { grid-column:2; display:flex; align-items:center; min-height:30px; position:relative; z-index:1; }
  .nw-summary-lead h3 { font-size:22px; font-weight:700; letter-spacing:-.45px; line-height:1.3; margin:0; overflow-wrap:anywhere; }
  .nw-summary-lines { grid-column:2; margin:8px 0 0; font-size:12px; line-height:1.6; position:relative; z-index:1; }
  .nw-summary-lines p { margin:4px 0; }
  .nw-summary-lines p>span { color:var(--secondary-text-color); margin-right:8px; font-size:10px; }
  .nw-brief-details { grid-column:2; margin:10px 0 0; font-size:11px; position:relative; z-index:1; }
  .nw-brief-details summary, .nw-measure-details summary { cursor:pointer; color:var(--secondary-text-color); font-size:11px; padding:6px 0; }
  #comfort .me-jauge { margin:0 0 16px; }
  #comfort .me-rail { height:6px; }
  #comfort .me-cur i { width:14px; height:14px; top:-7px; left:-7px; animation:none; box-shadow:none; }
  #comfort .me-decos { border:0; padding:0; margin:0 0 14px; gap:6px 14px; }
  #comfort .me-d b { font-size:11px; font-weight:650; }
  #tuiles .me-tuiles { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; padding:0; border:0; }
  #tuiles .me-tu { padding:14px 12px; border-color:var(--divider-color,rgba(150,150,150,.18)); background:rgba(150,150,150,.035); border-radius:12px; gap:10px; }
  #tuiles .me-tuic { background:transparent; width:30px; height:30px; flex-basis:30px; }
  #tuiles .me-rose { width:30px; height:30px; flex-basis:30px; animation:none; }
  .nw-metric-name { display:block; color:var(--secondary-text-color); font-size:10px; margin-bottom:7px; }
  #tuiles .me-tuv { font-size:23px; font-weight:650; line-height:1.2; }
  #tuiles .me-tul { font-size:11px; color:var(--primary-text-color); font-weight:500; margin-top:5px; }
  #tuiles .me-tus { font-size:10px; font-weight:400; margin-top:3px; }
  .nw-measure-details { margin:12px 0 0; }
  #bilan .me-bilan { padding:10px 0 0; gap:12px; }
  #bilan .me-bl { background:transparent; border-color:var(--divider-color,rgba(150,150,150,.18)); }
  #pastilles .me-pas { padding:16px 0 4px; margin-top:14px; gap:8px 18px; }
  #pastilles .me-pa b { font-size:11px; font-weight:650; }
  .nw-forecast-grid { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:22px; }
  .nw-forecast-grid>div { min-width:0; }
  #courbe .me-courbe, #jours .me-jours { padding:0; border:0; }
  #jours .me-jours { padding-left:20px; border-left:1px solid var(--divider-color,rgba(150,150,150,.18)); }
  #jours .me-j { padding:4px 0; }
  .nw-empty { color:var(--secondary-text-color); font-size:12px; }
  @container (max-width:850px) {
    #tuiles .me-tuiles { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .nw-forecast-grid { grid-template-columns:minmax(0,1fr); gap:20px; }
    #jours .me-jours { padding:0; border:0; }
  }
  @container (max-width:450px) {
    .nw-section { padding:16px 14px; }
    .nw-section-heading { margin-bottom:14px; }
    .nw-section-heading .nw-attention { margin-left:0; }
    .nw-synthesis { grid-template-columns:60px minmax(0,1fr); column-gap:12px; }
    .nw-summary-emblem { width:60px; height:60px; grid-row:2; }
    .nw-summary-lead { min-height:66px; }
    .nw-summary-lead h3 { font-size:17px; }
    .nw-summary-lines, .nw-brief-details { grid-column:1 / -1; margin-left:0; }
    #tuiles .me-tu { align-items:flex-start; padding:12px 10px; gap:5px; }
    #tuiles .me-tuic, #tuiles .me-rose { width:22px; height:22px; flex-basis:22px; }
    #tuiles .me-tuic ha-icon { --mdc-icon-size:19px; }
    #tuiles .me-tuv { font-size:20px; }
    #container #tuiles .me-tus { white-space:normal; overflow-wrap:anywhere; }
  }
  @media (prefers-reduced-motion:reduce) {
    .nw-synthesis .me-rond, .nw-synthesis .me-halo { animation:none; }
  }
`;

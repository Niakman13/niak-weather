import { css, html, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { briefPresentation, briefSecondarySignals } from './brief-preview';
import { renderAtmo } from './atmo-view';
import { finite, type History } from './local-model';
import { renderRecentDetails } from './recent-details';
import type {StationDerived} from './station-history';
import { comfortColor } from './comfort-color';
import { buildCurrentWeather } from './current-weather';
import { currentMetrics, meaningfulComfort, weatherSourceLabel } from './current-measurements';
import './weather-sky';
import type { WeatherBrief } from './weather-brief';
import type { HassEntity, HomeAssistant, WeatherCardConfig, WeatherForecast } from './types';

function toggleSynthesisInfo(event: Event) {
  const button=event.currentTarget as HTMLButtonElement;
  const panel=button.parentElement!.querySelector<HTMLElement>('.nw-brief-panel')!;
  if(panel.matches(':popover-open')) { panel.hidePopover();return; }
  const bounds=button.closest('.nw-synthesis')!.getBoundingClientRect();
  const anchor=button.getBoundingClientRect();
  const left=Math.max(8,bounds.left),right=Math.min(document.documentElement.clientWidth-8,bounds.right);
  const top=Math.max(8,Math.min(anchor.bottom+12,window.innerHeight-160));
  panel.style.left=`${left}px`;panel.style.top=`${top}px`;
  panel.style.width=`${Math.max(0,right-left)}px`;
  panel.style.maxHeight=`${Math.max(80,window.innerHeight-top-12)}px`;
  panel.showPopover();
}

export function renderDashboard(rendered: Record<string, string>, brief: WeatherBrief | undefined, model: HassEntity,
  hass: HomeAssistant, config: WeatherCardConfig, now: Date, location: string, hourly:WeatherForecast[] = [], history:History={}, rainHistory:History={},derived?:StationDerived) {
  const preview = brief ? briefPresentation(brief) : undefined;
  const secondary = brief ? briefSecondarySignals(brief) : [];
  const headline = preview?.headline;
  const feels = finite(model.attributes.ressenti);
  const showComfort=meaningfulComfort(hass,config,model);
  const comfortWord=String(model.attributes.confort ?? ''),humidityWord=String(model.attributes.humidite_tx ?? '');
  // Where the feel comes from, like the source bubbles of the Rain, Wind and Pressure columns.
  const provider=weatherSourceLabel(hass,config),stationTemperature=!!config.temperature_entity;
  const comfortSource=!stationTemperature?provider:model.attributes.hum_source==='bulletin'?`Station locale · humidité ${provider}`:'Station locale';
  const metrics=currentMetrics(hass,config,model,hourly,now);
  const weatherNow=buildCurrentWeather(hass,config,model);
  const hasDetails=metrics.some(m=>m.key!=='temperature')||!!(config.rain_total_entity||config.rain_24h_entity||config.daily_rain_entity||config.weekly_rain_entity||config.monthly_rain_entity||config.yearly_rain_entity||config.max_daily_gust_entity);
  const degrees=(value:number)=>new Intl.NumberFormat(hass.language || 'fr',{maximumFractionDigits:1}).format(value);
  const groups = [
    { key:'official', title:'Vigilance officielle', description:'Bulletin du département choisi dans les réglages.' },
    { key:'now', title:'Maintenant', description:'Mesures et estimations actuelles à la maison.' },
    { key:'future', title:'À venir', description:'Prévisions du fournisseur météo pour la période indiquée ; elles peuvent évoluer.' },
    { key:'environment', title:'Air et pollens', description:'Indices de votre zone, pour aujourd’hui ou demain selon le libellé.' },
  ];
  const synthesisInfo=brief?html`<div class="nw-brief-details"><h2 id="nw-synthesis-title">Synthèse</h2><button class="nw-synthesis-info-button" aria-label="Consulter les points à retenir de la synthèse" aria-expanded="false" aria-controls="nw-synthesis-info" @click=${toggleSynthesisInfo}><span class="nw-info-icon" aria-hidden="true">i</span></button><span class="nw-synthesis-location">${location}</span>
    <div id="nw-synthesis-info" class="nw-brief-panel" popover="auto" role="region" aria-label="Les points à retenir" @toggle=${(event:Event)=>{
      const panel=event.currentTarget as HTMLElement;
      panel.parentElement!.querySelector('.nw-synthesis-info-button')!.setAttribute('aria-expanded',String(panel.matches(':popover-open')));
    }}><header class="nw-brief-panel-heading"><h3>Les points à retenir</h3><button aria-label="Fermer les informations de synthèse" @click=${(event:Event)=>(event.currentTarget as HTMLElement).closest<HTMLElement>('.nw-brief-panel')!.hidePopover()}>Fermer ×</button></header><div class="nw-brief-groups">${groups.map(group=>{
      const signals=brief.signals.filter(s=>s.group===group.key&&(s.severity>0||s.key===preview?.outlookKey||s.key==='rain-now'||s.key==='pressure'||s.key==='comfort-gap'||s.key==='rain-tomorrow'||s.key==='fog-later'));
      return signals.length?html`<section class="nw-brief-group"><h4>${group.title}</h4><p class="nw-brief-context">${group.description}</p><ul>${signals.map(s=>html`<li><ha-icon icon=${s.icon}></ha-icon><span>${s.text}</span>${s.entity?html`<button data-entity=${s.entity} aria-label=${`Source : ${s.text}`}>Source</button>`:nothing}</li>`)}</ul></section>`:nothing;
    })}</div>
    ${!brief.signals.some(s=>s.severity>0)?html`<p>Pas de point d’attention renforcé parmi les données disponibles.</p>`:nothing}
    ${brief.caveats.length?html`<details class="nw-brief-limits"><summary>Données à vérifier · ${brief.caveats.length}</summary><ul>${brief.caveats.map(c=>html`<li>${c}</li>`)}</ul></details>`:nothing}</div></div>`:nothing;
  // Night, storm and downpour skies stay dark whatever the theme: their text stays white, as on the sky itself.
  const darkSky=weatherNow.phase==='night'||['lightning','lightning-rainy','pouring'].includes(weatherNow.condition);
  return html`
    ${config.show_synthesis===false?nothing:html`<section id="heros" class=${`nw-section nw-synthesis${headline?'':' nw-synthesis--weather-only'}`} aria-labelledby="nw-synthesis-title" style=${`--vc:${brief?.rgb ?? '61,155,233'}`}>
      <div class="nw-sky-backdrop" aria-hidden="true"><niak-weather-sky .condition=${weatherNow.condition} .phase=${weatherNow.phase}
        .animated=${config.weather_animations!==false} .quality=${config.weather_animation_quality ?? 'standard'} .wind=${weatherNow.wind ?? 0}></niak-weather-sky></div>
      <header class="nw-section-heading">${brief?synthesisInfo:html`<h2 id="nw-synthesis-title">Météo actuelle</h2><span>${location}</span>`}</header>
      ${brief&&headline?html`<div class="nw-summary-emblem me-bulle" aria-hidden="true"><div class="me-halo"></div>
        <div class="me-rond"><ha-icon icon=${preview?.icon ?? 'mdi:information-outline'}></ha-icon></div></div>
      <div class="nw-summary-lead"><h3>${headline}</h3>
        ${preview?.selected.length ? html`<span class="nw-attention"><i aria-hidden="true"></i>${brief.label}</span>` : nothing}</div>
      <div class="nw-summary-lines">
        ${secondary.map(s => html`<p><span>${s.group === 'future' ? 'À venir' : s.group === 'environment' ? 'Environnement' : s.group === 'official' ? 'Vigilance' : 'Maintenant'}</span>${s.text}</p>`)}
      </div>`:nothing}
      <aside class=${`nw-current-weather${darkSky?' nw-current-weather--dark-sky':''}`} aria-label="Météo actuelle">
        <div class="nw-current-content"><span class="nw-current-kicker">En ce moment</span>
          <button class="nw-current-condition" data-entity=${weatherNow.conditionEntity ?? config.weather_entity} title=${weatherNow.source}><ha-icon icon=${weatherNow.icon}></ha-icon>${weatherNow.label}</button>
          ${weatherNow.temperature===undefined ? html`<span class="nw-current-missing">Température indisponible</span>` : html`
            <button class="nw-current-temperature" data-entity=${weatherNow.temperatureEntity} aria-label=${`${weatherNow.temperatureSource} : ${degrees(weatherNow.temperature)} degrés Celsius`}>${degrees(weatherNow.temperature)}<small>°C</small></button>`}
          <span class="nw-current-temperature-source nw-metric-source">${weatherNow.temperatureSource}</span>
        </div>
      </aside>
    </section>`}
    ${config.show_today===false?nothing:html`<section id="today" class="nw-section" aria-labelledby="nw-today-title" style="--vc:61,155,233">
      <header class="nw-section-heading"><h2 id="nw-today-title">Aujourd’hui</h2><span>${showComfort ? 'Mesures et ressenti' : 'Conditions actuelles'}</span></header>
      ${showComfort?html`<div id="comfort" style=${`--vc:${feels === undefined ? '150,150,150' : comfortColor(feels)}`}>
        <span class="nw-comfort-source" title=${`Source du ressenti : ${comfortSource}`}>${comfortSource}</span>
        <details class="nw-comfort-info"><summary aria-label="Comprendre le ressenti"><h3 class="nw-panel-title">Ressenti <span class="nw-info-icon" aria-hidden="true">i</span></h3></summary>
          <p>Une estimation de l’ambiance extérieure : l’humidex, calculé par la carte à partir de la température et de l’humidité (station, sinon bulletin), est ajusté selon le vent, le soleil, la pluie et la nuit lorsque les données sont disponibles. Le mot reprend l’échelle de stress thermique UTCI. Ce n’est pas un indice météo officiel.
            <a href="https://github.com/Niakman13/niak-weather#expliquer-le-ressenti" target="_blank" rel="noopener noreferrer">En savoir plus sur GitHub</a>.</p>
        </details>
        ${comfortWord?html`<p class="nw-comfort-word"><i aria-hidden="true"></i><strong>${comfortWord}</strong>${humidityWord?html`<span>· ${humidityWord}</span>`:nothing}</p>`:nothing}
        ${rendered.comfort ? unsafeHTML(rendered.comfort) : html`<p class="nw-empty">Ressenti indisponible</p>`}</div>`:nothing}
      ${hasDetails ? html`<div id="bilan" aria-label="Pluie, vent et pression">${renderRecentDetails(hass,config,history,rainHistory,now,metrics,derived,model)}</div>` : nothing}
      <div id="pastilles">${unsafeHTML(rendered.pastilles)}</div>
      ${renderAtmo(hass, config, now, 'today')}
    </section>`}
    ${config.show_predictions===false ? nothing : html`<section id="predictions" class="nw-section" aria-labelledby="nw-predictions-title">
      <header class="nw-section-heading"><h2 id="nw-predictions-title">Prévisions</h2><span>${config.forecast_source ?? (/france/i.test(String(hass.states[config.weather_entity]?.attributes.attribution)) ? 'Météo-France' : 'Prévisions météo')}</span></header>
      <div class="nw-forecast-grid"><div id="courbe">${unsafeHTML(rendered.courbe)}</div><div id="jours">${unsafeHTML(rendered.jours)}</div></div>
      ${renderAtmo(hass, config, now, 'tomorrow')}
    </section>`}`;
}

export const dashboardStyles = css`
  #container { display:block; }
  .nw-section { padding:24px 22px; border-top:1px solid var(--divider-color,rgba(150,150,150,.18)); color:var(--primary-text-color); }
  .nw-section+.nw-section { margin-top:20px; }
  .nw-section:first-child { border-top:0; }
  .nw-section-heading { display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; margin-bottom:18px; }
  .nw-section-heading h2 { font-size:19px; font-weight:750; margin:0; letter-spacing:-.25px; }
  .nw-section-heading>span { font-size:11px; color:var(--secondary-text-color); }
  .nw-attention { display:inline-flex; align-items:center; gap:6px; flex-shrink:0; margin-left:0; padding:6px 11px; border:1px solid rgba(var(--vc),.28); border-radius:999px; background:color-mix(in srgb,var(--card-background-color,#fff) 88%,rgb(var(--vc)) 12%); color:var(--primary-text-color); font-size:11px; font-weight:600; line-height:1.3; white-space:nowrap; }
  .nw-attention i { width:7px; height:7px; flex-shrink:0; border-radius:50%; background:rgb(var(--vc)); }
  .nw-synthesis { position:relative; isolation:isolate; overflow:hidden; display:grid; grid-template-columns:76px minmax(0,1fr) minmax(240px,.65fr); column-gap:20px; }
  .nw-sky-backdrop { position:absolute; inset:0; z-index:-2; pointer-events:none; }
  .nw-synthesis::after { content:''; position:absolute; inset:auto 0 0; height:80px; max-height:35%; z-index:-1; pointer-events:none; background:linear-gradient(180deg,transparent,var(--card-background-color,#fff)); }
  .nw-synthesis+#today { border-top:0; }
  .nw-synthesis::before { content:''; position:absolute; inset:0; z-index:-1; pointer-events:none; background:linear-gradient(90deg,var(--card-background-color,#fff) 0%,color-mix(in srgb,var(--card-background-color,#fff) 94%,transparent) 30%,color-mix(in srgb,var(--card-background-color,#fff) 62%,transparent) 44%,transparent 60%); }
  .nw-synthesis>.nw-section-heading { grid-column:1 / 3; grid-row:1; position:relative; z-index:1; }
  .nw-summary-emblem { grid-column:1; grid-row:2; align-self:start; margin-top:3px; width:76px; height:76px; pointer-events:none; }
  .nw-synthesis .me-rond { background:radial-gradient(circle at 35% 25%,rgba(var(--vc),.22),rgba(var(--vc),.06)); border:1.5px solid rgba(var(--vc),.62); animation:nwEmblemGlow 5.2s ease-in-out infinite; }
  .nw-synthesis .me-halo { inset:-55px; background:radial-gradient(circle,rgba(var(--vc),.28) 0%,rgba(var(--vc),.19) 30%,rgba(var(--vc),.09) 56%,rgba(var(--vc),0) 84%); filter:blur(20px); opacity:.78; animation:nwHalo 5.2s ease-in-out infinite; }
  @keyframes nwHalo { 0%,100% { opacity:.52; transform:scale(.94); } 50% { opacity:.78; transform:scale(1.08); } }
  @keyframes nwEmblemGlow { 0%,100% { box-shadow:0 0 8px rgba(var(--vc),.18),inset 0 0 8px rgba(var(--vc),.06); } 50% { box-shadow:0 0 14px rgba(var(--vc),.3),inset 0 0 10px rgba(var(--vc),.1); } }
  .nw-summary-lead { grid-column:2; grid-row:2; display:flex; flex-direction:column; align-items:flex-start; flex-wrap:wrap; gap:8px; min-height:30px; position:relative; z-index:1; }
  .nw-summary-lead h3 { flex:0 0 auto; }
  .nw-summary-lead h3 { font-size:22px; font-weight:700; letter-spacing:-.45px; line-height:1.3; margin:0; overflow-wrap:anywhere; }
  .nw-summary-lines { grid-column:1 / 3; grid-row:3; margin:8px 0 0; font-size:12px; line-height:1.6; position:relative; z-index:1; }
  .nw-summary-lines p { margin:7px 0; }
  .nw-summary-lines p>span { display:inline-block; color:var(--primary-text-color); margin-right:8px; padding:3px 9px; border:1px solid rgba(var(--vc),.2); border-radius:999px; background:color-mix(in srgb,var(--card-background-color,#fff) 92%,rgb(var(--vc)) 8%); font-size:10px; font-weight:600; line-height:1.4; vertical-align:baseline; }
  .nw-brief-details { display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin:0;font-size:11px;min-width:0; }
  .nw-brief-details>.nw-synthesis-info-button { display:inline-flex;align-items:center;justify-content:center;border:0;background:none;padding:3px;color:inherit;cursor:pointer; }
  .nw-synthesis-info-button:focus-visible { outline:2px solid var(--primary-color);outline-offset:2px;border-radius:50%; }
  .nw-synthesis-info-button[aria-expanded="true"] .nw-info-icon { color:var(--primary-color);border-color:currentColor; }
  .nw-synthesis-location { font-size:11px;color:var(--secondary-text-color); }
  .nw-brief-panel { position:fixed;inset:auto;margin:0;padding:16px;box-sizing:border-box;border:1px solid var(--divider-color,rgba(150,150,150,.2));border-radius:14px;background:var(--card-background-color,#fff);color:var(--primary-text-color);box-shadow:0 14px 40px #0004;line-height:1.5;overflow:auto;overscroll-behavior:contain; }
  .nw-brief-panel::backdrop { background:transparent; }
  .nw-brief-panel-heading { position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:6px 0;background:var(--card-background-color,#fff); }
  .nw-brief-panel-heading h3 { font-size:14px;margin:0; }
  .nw-brief-panel-heading button { font:inherit;font-size:11px;cursor:pointer;border:0;background:none;color:var(--secondary-text-color);padding:5px; }
  .nw-current-weather { position:relative; grid-column:3; grid-row:1 / span 3; min-height:190px; display:flex; justify-content:flex-end; align-items:center; }
  .nw-current-content { position:relative; display:flex; flex-direction:column; align-items:flex-end; text-align:right; color:var(--primary-text-color); text-shadow:0 0 10px var(--card-background-color,#fff),0 0 3px var(--card-background-color,#fff); padding:8px 0 8px 26px; gap:4px; }
  .nw-current-kicker { font-size:10px; text-transform:uppercase; letter-spacing:.12em; opacity:.85; }
  .nw-current-weather button { font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer; text-align:right; text-shadow:inherit; }
  .nw-current-condition { display:flex; align-items:center; justify-content:flex-end; gap:7px; font-size:16px !important; font-weight:650 !important; }
  .nw-current-condition ha-icon { --mdc-icon-size:22px; }
  .nw-current-temperature { font-size:46px !important; line-height:1.1; font-weight:700 !important; letter-spacing:-1.5px; margin-top:4px; }
  .nw-current-temperature small { font-size:20px; font-weight:400; margin-left:3px; vertical-align:super; letter-spacing:0; }
  .nw-current-temperature-source { font-size:10px; opacity:.8; }
  .nw-current-missing { font-size:13px; margin-top:8px; }
  .nw-synthesis.nw-synthesis--weather-only { grid-template-columns:minmax(0,1fr); }
  .nw-synthesis--weather-only>.nw-section-heading { grid-column:1; grid-row:1; }
  .nw-synthesis--weather-only .nw-current-weather { grid-column:1; grid-row:2; min-height:150px; margin-top:0; }
  @container (max-width:650px) {
    .nw-synthesis { grid-template-columns:60px minmax(0,1fr); column-gap:12px; }
    .nw-current-weather { grid-column:1 / -1; grid-row:4; min-height:172px; margin-top:18px; }
    .nw-synthesis::before { background:linear-gradient(90deg,var(--card-background-color,#fff),color-mix(in srgb,var(--card-background-color,#fff) 95%,transparent) 32%,color-mix(in srgb,var(--card-background-color,#fff) 68%,transparent) 60%,color-mix(in srgb,var(--card-background-color,#fff) 18%,transparent)); }
  }
  .nw-brief-limits summary, .nw-measure-details summary { cursor:pointer; color:var(--secondary-text-color); font-size:11px; padding:6px 0; }
  #comfort { position:relative; border:1px solid var(--divider-color,rgba(150,150,150,.18)); border-radius:12px; background:rgba(150,150,150,.035); padding:14px 16px; margin-bottom:14px; }
  .nw-panel-title { margin:0; font-size:12px; font-weight:650; color:var(--secondary-text-color); }
  .nw-comfort-info>summary { cursor:pointer; list-style:none; width:fit-content; border-radius:6px; }
  .nw-comfort-info>summary::-webkit-details-marker { display:none; }
  .nw-comfort-info>summary:focus-visible { outline:2px solid var(--primary-color); outline-offset:3px; }
  .nw-comfort-info .nw-panel-title { display:flex; align-items:center; gap:7px; }
  .nw-info-icon { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; box-sizing:border-box; border:1px solid var(--secondary-text-color); border-radius:50%; font:italic 650 13px Georgia,serif; color:var(--secondary-text-color); }
  .nw-comfort-info[open] .nw-info-icon { color:var(--primary-color); border-color:currentColor; }
  .nw-comfort-info p { margin:10px 0 14px; padding:10px 12px; border:1px solid var(--divider-color,rgba(150,150,150,.2)); border-radius:10px; background:rgba(150,150,150,.04); color:var(--primary-text-color); font-size:12px; line-height:1.6; overflow-wrap:anywhere; }
  .nw-comfort-info a { color:var(--primary-color); text-decoration:underline; }
  .nw-comfort-word { display:flex; flex-wrap:wrap; align-items:baseline; gap:6px; margin:8px 0 0; font-size:13px; color:var(--secondary-text-color); }
  .nw-comfort-word i { align-self:center; width:9px; height:9px; border-radius:50%; background:color-mix(in srgb,rgb(var(--vc)) 65%,var(--primary-text-color) 35%); }
  .nw-comfort-word strong { font-size:18px; font-weight:700; letter-spacing:-.3px; color:var(--primary-text-color); }
  .nw-comfort-source { position:absolute; top:12px; right:14px; max-width:55%; overflow:hidden; text-overflow:ellipsis; border:1px solid var(--divider-color,rgba(150,150,150,.2)); border-radius:999px; padding:4px 8px; font-size:10px; color:var(--secondary-text-color); white-space:nowrap; }
  #comfort .me-jauge { margin:43px 0 16px; }
  #comfort .nw-feels-value { position:absolute; top:-37px; transform:translateX(-50%); font-size:27px; font-weight:750; line-height:1; white-space:nowrap; color:rgb(var(--vc)); color:color-mix(in srgb,rgb(var(--vc)) 65%,var(--primary-text-color) 35%); }
  #comfort .nw-feels-value small { font-size:12px; font-weight:500; margin-left:3px; }
  #comfort .me-rail { height:6px; }
  #comfort .me-tick { top:-9px; height:20px; width:4px; margin-left:-4px; box-sizing:content-box; border:2px solid var(--card-background-color,#fff); border-radius:4px; background:color-mix(in srgb,var(--primary-text-color) 65%,var(--card-background-color,#fff) 35%); opacity:1; box-shadow:0 0 0 1px rgba(150,150,150,.25); z-index:1; }
  #comfort .me-cur { z-index:2; }
  #comfort .me-cur i { width:16px; height:16px; top:-8px; left:-8px; border:2px solid var(--card-background-color,#fff); background:color-mix(in srgb,rgb(var(--vc)) 65%,var(--primary-text-color) 35%); box-shadow:0 0 0 1px rgba(var(--vc),.42),0 0 9px rgba(var(--vc),.4); animation:nwComfortPulse 4.8s ease-in-out infinite; }
  @keyframes nwComfortPulse { 0%,100% { box-shadow:0 0 0 1px rgba(var(--vc),.35),0 0 6px rgba(var(--vc),.28); } 50% { box-shadow:0 0 0 2px rgba(var(--vc),.45),0 0 13px rgba(var(--vc),.52); } }
  #comfort .me-decos { border:0; padding:0; margin:0; gap:8px; justify-content:center; }
  #comfort .me-d, #pastilles .me-pa { padding:6px 10px; border:1px solid var(--divider-color,rgba(150,150,150,.18)); border-radius:999px; background:rgba(150,150,150,.045); box-sizing:border-box; max-width:100%; min-height:30px; align-items:center; }
  #comfort .me-d b { font-size:11px; font-weight:650; }
  #tuiles .me-tuiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr)); gap:10px; padding:0; border:0; }
  #tuiles .me-tu { padding:14px 12px; border-color:var(--divider-color,rgba(150,150,150,.18)); background:rgba(150,150,150,.035); border-radius:12px; gap:10px; }
  #tuiles .nw-current-metric { display:flex; flex-direction:column; align-items:flex-start; }
  .nw-metric-source { display:inline-flex; padding:3px 8px; border-radius:999px; border:1px solid var(--divider-color,rgba(150,150,150,.18)); background:color-mix(in srgb,var(--primary-color,#3d9be9) 7%,transparent); color:var(--secondary-text-color); font-size:10px; font-weight:600; line-height:1.4; }
  .nw-current-temperature-source.nw-metric-source { color:var(--primary-text-color); background:color-mix(in srgb,var(--card-background-color,#fff) 70%,transparent); border-color:var(--divider-color,rgba(150,150,150,.3)); opacity:1; margin-top:5px; }
  .nw-current-weather--dark-sky .nw-current-content { color:white; text-shadow:0 1px 5px #0b1a2b99; }
  .nw-current-weather--dark-sky .nw-current-temperature-source.nw-metric-source { color:white; background:rgba(15,40,65,.25); border-color:rgba(255,255,255,.28); }
  .nw-metric-body { display:flex; align-items:center; gap:10px; min-width:0; }
  .nw-current-metric .me-tuv { white-space:normal; overflow-wrap:anywhere; }
  #tuiles .me-tuic { background:transparent; width:30px; height:30px; flex-basis:30px; }
  #tuiles .me-rose { width:30px; height:30px; flex-basis:30px; animation:none; }
  .nw-metric-name { display:block; color:var(--secondary-text-color); font-size:10px; margin-bottom:7px; }
  #tuiles .me-tuv { font-size:23px; font-weight:650; line-height:1.2; }
  #tuiles .me-tul { font-size:11px; color:var(--primary-text-color); font-weight:500; margin-top:5px; }
  #tuiles .me-tus { font-size:10px; font-weight:400; margin-top:3px; }
  #bilan .me-bilan { padding:18px 0 0; gap:12px; }
  #bilan .me-bl { background:rgba(150,150,150,.035); border-color:var(--divider-color,rgba(150,150,150,.18)); }
  #bilan .me-bln { flex-basis:102px; }
  .nw-brief-groups { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin:0 0 12px; }
  .nw-brief-group { min-width:0;padding:0;border:0;background:none; }
  .nw-brief-group:only-child { grid-column:1/-1; }
  .nw-brief-group h4 { margin:0; font-size:12px; font-weight:650; }
  .nw-brief-context { font-size:11px; color:var(--secondary-text-color); line-height:1.5; }
  .nw-brief-group ul { list-style:none; padding:0; margin:8px 0 0; }
  .nw-brief-group li { display:flex; align-items:flex-start; gap:7px; padding:6px 0; line-height:1.5; font-size:12px; }
  .nw-brief-group li>span { flex:1; min-width:0; }
  .nw-brief-group ha-icon { --mdc-icon-size:15px; color:var(--secondary-text-color); margin-top:2px; }
  .nw-brief-group button { flex-shrink:0; font-size:10px; padding:3px 6px; border:1px solid var(--divider-color,rgba(150,150,150,.2));border-radius:999px; background:transparent; color:var(--secondary-text-color); }
  .nw-brief-limits li { padding:4px 0; line-height:1.5; }
  #pastilles .me-pas { padding:16px 0 4px; margin-top:0; gap:8px; border:0; justify-content:center; }
  #pastilles .me-pa b { font-size:11px; font-weight:650; }
  #jours .nw-week-labels { min-height:22px; padding:4px 0 7px; }
  #jours .nw-week-labels .me-jmin, #jours .nw-week-labels .me-jmax, #jours .nw-week-labels .me-jp { display:flex; flex-direction:column; align-items:center; font-size:9px; font-weight:600; color:var(--secondary-text-color); opacity:1; line-height:1.35; }
  #jours .nw-week-labels small { font-size:8px; font-weight:400; }
  #jours .nw-week-labels .me-jbar { background:none; }
  .nw-forecast-grid { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:22px; }
  .nw-forecast-grid>div { min-width:0;padding:20px;border:1px solid var(--divider-color,rgba(150,150,150,.2));border-radius:16px;background:rgba(150,150,150,.035); }
  #courbe .me-courbe, #jours .me-jours { padding:0; border:0; }
  #courbe { display:flex; flex-direction:column; }
  #jours { display:flex; flex-direction:column; }
  #jours .me-jours { flex:1; box-sizing:border-box; }
  #courbe .me-courbe { display:flex; flex-direction:column; flex:1; box-sizing:border-box; }
  #courbe .me-ttl { margin-bottom:12px; }
  #courbe .me-graph { flex:1 0 190px; height:auto; min-height:190px; }
  #courbe .me-nowl, #courbe .me-jourl { top:8px;white-space:nowrap; }
  #courbe .me-jourl { top:24px; }
  #courbe .me-axe { flex-shrink:0; margin-top:10px; }
  #courbe .me-pied { flex-shrink:0; margin-top:8px; }
  #jours .me-j { padding:4px 0; }
  .nw-empty { color:var(--secondary-text-color); font-size:12px; }
  @container (max-width:850px) {
    #tuiles .me-tuiles { grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr)); }
    .nw-forecast-grid { grid-template-columns:minmax(0,1fr); gap:20px; }
    #courbe .me-courbe { height:auto; }
    #courbe .me-graph { flex:none; height:200px; min-height:200px; }
    #jours .me-jours { padding:0; border:0; }
  }
  @container (max-width:450px) {
    .nw-section { padding:16px 14px; }
    .nw-section+.nw-section { margin-top:16px; }
    .nw-section-heading h2 { font-size:17px; }
    .nw-section-heading { margin-bottom:14px; }
    .nw-attention { margin-left:0; }
    .nw-synthesis { grid-template-columns:60px minmax(0,1fr); column-gap:12px; }
    .nw-summary-emblem { width:60px; height:60px; grid-row:2; }
    .nw-summary-lead { min-height:66px; }
    .nw-summary-lead h3 { font-size:17px; }
    .nw-summary-lines { grid-column:1 / -1; margin-left:0; }
    .nw-brief-groups { grid-template-columns:minmax(0,1fr); }
    #comfort { padding:12px; }
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

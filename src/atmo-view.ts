import { css, html, nothing, svg } from 'lit';
import { atmoField, atmoFields, atmoMetrics, atmoReading, pollenMetrics, pollutantMetrics, type AtmoReading } from './atmo';
import type { AtmoMetric, HomeAssistant, WeatherCardConfig } from './types';

export function usesAtmoPollens(config: WeatherCardConfig): boolean {
  return config.pollen_source === 'atmo' || (config.pollen_source === undefined && atmoFields.some(f => !!config[f]));
}
function levelDisc(r: AtmoReading) {
  const active = r.value !== undefined && r.value <= 6 && !r.stale ? r.value : 0;
  const face = r.stale ? 'mdi:clock-outline' : r.value === 7 ? 'mdi:information-outline' : !active ? 'mdi:help-outline'
    : active <= 2 ? 'mdi:emoticon-happy-outline' : active === 3 ? 'mdi:emoticon-neutral-outline'
      : active <= 5 ? 'mdi:emoticon-sad-outline' : 'mdi:emoticon-dead-outline';
  return html`<span class="nw-atmo-disc nw-atmo-ring" aria-hidden="true"><svg viewBox="0 0 48 48">
    ${Array.from({ length:6 }, (_, i) => {
      const angle = (i * 60 - 90) * Math.PI / 180, end = angle + Math.PI / 3;
      const point = (a: number) => `${(24 + 23 * Math.cos(a)).toFixed(3)} ${(24 + 23 * Math.sin(a)).toFixed(3)}`;
      // Transparent active sectors reveal one continuous angular gradient underneath.
      // Opaque inactive sectors mask it completely, including unavailable/stale/event values.
      return svg`<path d=${`M24 24 L${point(angle)} A23 23 0 0 1 ${point(end)} Z`} fill=${i < active ? 'none' : 'var(--card-background-color,#fff)'} />`;
    })}<circle cx="24" cy="24" r="23.5" fill="none" stroke="var(--card-background-color,#fff)" stroke-width="2" />
    <circle cx="24" cy="24" r="23.5" fill="none" stroke="var(--divider-color,rgba(150,150,150,.25))" stroke-width="1" /></svg>
    <span><ha-icon icon=${face}></ha-icon></span></span>`;
}
export function renderAtmo(hass: HomeAssistant, config: WeatherCardConfig, now = new Date(), scope: 'today' | 'tomorrow' | 'both' = 'both') {
  const includePollen = config.pollen_source !== 'none' && config.pollen_source !== 'legacy';
  const read = (metric: AtmoMetric, next: boolean) => atmoReading(hass, config[atmoField(metric, next)], !['air', ...pollutantMetrics].includes(metric), metric.endsWith('_concentration'), now);
  const badge = (r: AtmoReading, label: string, icon: string, pollen: boolean) => html`
    <span class="nw-atmo-badge" data-entity=${r.id} role="button" tabindex="0" aria-label=${`${label} : ${r.label}${r.stale ? ', données anciennes' : ''}`} style=${`--atmo-color:${r.color};--atmo-angle:${r.value !== undefined && r.value <= 6 && !r.stale ? r.value * 60 : 0}deg`} title=${`${label} · ${r.label}${r.updated ? ' · publication ' + r.updated : ''}`}>
      <b class="nw-atmo-name">${label}</b>${levelDisc(r)}
      <span class="nw-atmo-caption"><span>${r.label}</span>${r.value === undefined ? nothing : html`<small>${r.value === 7 && !pollen ? 'code 7 · hors échelle' : `${r.value}/6`}</small>`}
      ${r.stale ? html`<small class="nw-atmo-stale">données anciennes</small>` : nothing}
      </span>
    </span>`;
  const day = (next: boolean) => {
    const air = read('air', next), pollen = includePollen ? read('pollen', next) : undefined;
    const pollution = pollutantMetrics.map(metric => ({ metric, r: read(metric, next) })).filter(v => !!v.r);
    const species = includePollen ? pollenMetrics.map(metric => ({ metric, r: read(metric, next), c: read(`${metric}_concentration` as AtmoMetric, next) })).filter(v => !!v.r || !!v.c) : [];
    const readings = [air, pollen, ...pollution.map(v => v.r), ...species.flatMap(v => [v.r, v.c])].filter((r): r is AtmoReading => !!r);
    if (!readings.length) return nothing;
    const zone = [...new Set(readings.map(r => r.zone).filter(Boolean))].join(' / ');
    const dates = [...new Set(readings.map(r => r.updated).filter(Boolean))].join(' / ');
    // Keep a concerning sub-index visible even when the configured global index is lower/missing.
    // Never rename that sub-index as a global index or use concentrations as levels.
    const worstPollutant = pollution.filter(v => !v.r!.stale && v.r!.value !== undefined && v.r!.value! <= 6)
      .sort((a, b) => b.r!.value! - a.r!.value!)[0];
    const worstSpecies = species.filter(v => v.r && !v.r.stale && v.r.value !== undefined)
      .sort((a, b) => b.r!.value! - a.r!.value!)[0];
    const extraAir = worstPollutant && (!air || air.stale || air.value === undefined || worstPollutant.r!.value! > air.value) ? worstPollutant : undefined;
    const extraPollen = worstSpecies && (!pollen || pollen.stale || pollen.value === undefined || worstSpecies.r!.value! > pollen.value) ? worstSpecies : undefined;
    const body = html`<div class="nw-atmo-row">${air ? badge(air, 'Air extérieur', 'mdi:air-filter', false) : nothing}${pollen ? badge(pollen, 'Pollens', 'mdi:flower-pollen', true) : nothing}
      ${extraAir ? badge(extraAir.r!, atmoMetrics[extraAir.metric].label.replace(' — sous-indice', ''), atmoMetrics[extraAir.metric].icon, false) : nothing}
      ${extraPollen ? badge(extraPollen.r!, atmoMetrics[extraPollen.metric].label, atmoMetrics[extraPollen.metric].icon, true) : nothing}</div>
      ${config.show_atmo_details === false || config.mode === 'compact' ? nothing : html`<details class="nw-atmo-breakdown"><summary>Détails des polluants et pollens</summary>
        ${pollution.length ? html`<div class="nw-atmo-kind">Sous-indices de pollution · échelle Atmo 1–6</div><div class="nw-atmo-row">${pollution.map(({ metric, r }) => badge(r!, atmoMetrics[metric].label.replace(' — sous-indice', ''), atmoMetrics[metric].icon, false))}</div>` : nothing}
        ${species.length ? html`<div class="nw-atmo-kind">Niveaux de pollens · échelle Atmo 1–6</div><div class="nw-atmo-row nw-atmo-species">${species.map(({ metric, r, c }) => html`<div class="nw-atmo-species-item">
          ${r ? badge(r, atmoMetrics[metric].label, atmoMetrics[metric].icon, true) : nothing}
          ${c ? html`<span class="nw-atmo-concentration" data-entity=${c.id} role="button" tabindex="0" aria-label=${`Concentration ${atmoMetrics[metric].label}`} title="Concentration déclarée par l’intégration Atmo France">
            ${!r || r.value !== undefined ? c.value === undefined ? 'Concentration indisponible' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(c.value)}${c.unit ? ' ' + c.unit : ' (unité non fournie)'}` : 'Concentration non confirmée'}
            ${c.stale ? ' · données anciennes' : ''}</span>` : nothing}</div>`)}</div>` : nothing}
        ${dates ? html`<div class="nw-atmo-date">Publication Atmo : ${dates}. ${readings.some(r => r.stale) ? 'Données anciennes : à vérifier dans l’intégration.' : ''}</div>` : nothing}</details>`}
      ${readings.some(r => r.stale) ? html`<p class="nw-atmo-date">Certaines données sont anciennes : vérifier les sources.</p>` : nothing}`;
    const title = html`${next ? 'Demain · Air et pollens' : 'Air et pollens'} <span>Atmo France${zone ? ' · ' + zone : ''}</span>`;
    return next ? html`<details open class="nw-atmo-day nw-atmo-next"><summary>${title}</summary>${body}</details>`
      : html`<section class="nw-atmo-day" aria-label="Air extérieur et pollens Atmo France aujourd’hui"><div class="nw-atmo-heading">${title}</div>${body}</section>`;
  };
  return html`${scope === 'tomorrow' ? nothing : day(false)}${scope === 'today' || config.show_atmo_tomorrow === false || config.mode === 'compact' ? nothing : day(true)}`;
}
export const atmoStyles = css`
  .nw-atmo-day { border-top:1px solid var(--divider-color,rgba(150,150,150,.14)); margin-top:16px; padding:14px 0 0; color:var(--primary-text-color); font-size:12px; }
  .nw-atmo-heading, .nw-atmo-next>summary { font-size:11px; font-weight:650; }
  .nw-atmo-heading span, .nw-atmo-next>summary span { color:var(--secondary-text-color); font-weight:400; margin-left:8px; }
  .nw-atmo-next>summary { cursor:pointer; padding:2px 0; }
  .nw-atmo-row { display:flex; flex-wrap:wrap; gap:16px 28px; margin-top:14px; min-width:0; }
  .nw-atmo-badge { display:inline-flex; flex-direction:column; align-items:center; gap:7px; cursor:pointer; padding:2px 0; min-width:80px; max-width:130px; text-align:center; }
  .nw-atmo-name { font-size:11px; font-weight:500; color:var(--primary-text-color); }
  .nw-atmo-disc { display:grid; place-items:center; width:48px; height:48px; border-radius:50%; background:conic-gradient(#58b995 0deg,#93c977 90deg,#e1d066 150deg,#eab360 210deg,#e88b60 270deg,#dd5b69 330deg,#cf4b60 360deg); }
  .nw-atmo-disc svg, .nw-atmo-disc>span { grid-area:1 / 1; }
  .nw-atmo-disc svg { width:100%; height:100%; }
  .nw-atmo-disc path { stroke:var(--card-background-color,#fff); stroke-width:1; }
  .nw-atmo-disc>span { display:grid; place-items:center; width:22px; height:22px; border-radius:50%; background:var(--card-background-color,#fff); border:1px solid var(--divider-color,rgba(150,150,150,.2)); z-index:1; }
  .nw-atmo-badge ha-icon { --mdc-icon-size:16px; color:var(--secondary-text-color); }
  .nw-atmo-caption { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:0; }
  .nw-atmo-caption>span { font-size:11px; font-weight:600; }
  .nw-atmo-badge small { font-size:10px; color:var(--secondary-text-color); }
  .nw-atmo-breakdown { margin-top:12px; }
  .nw-atmo-breakdown>summary { cursor:pointer; color:var(--secondary-text-color); font-size:10px; padding:4px 0; }
  .nw-atmo-breakdown .nw-atmo-disc { width:42px; height:42px; }
  .nw-atmo-breakdown .nw-atmo-disc>span { width:20px; height:20px; }
  .nw-atmo-breakdown ha-icon { --mdc-icon-size:14px; }
  .nw-atmo-kind, .nw-atmo-date { color:var(--secondary-text-color); font-size:10px; margin-top:10px; }
  .nw-atmo-species-item { display:flex; flex-direction:column; gap:3px; max-width:100%; }
  .nw-atmo-concentration { cursor:pointer; font-size:10px; color:var(--secondary-text-color); }
  .nw-atmo-stale { font-style:italic; }
  @container (max-width:400px) { .nw-atmo-heading span { display:block; margin:3px 0 0; } .nw-atmo-row { gap:12px 20px; } }
`;

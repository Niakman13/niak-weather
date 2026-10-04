import { css, html, nothing } from 'lit';
import { atmoField, atmoFields, atmoMetrics, atmoReading, pollenMetrics, pollutantMetrics, type AtmoReading } from './atmo';
import type { AtmoMetric, HomeAssistant, WeatherCardConfig } from './types';

export function usesAtmoPollens(config: WeatherCardConfig): boolean {
  return config.pollen_source === 'atmo' || (config.pollen_source === undefined && atmoFields.some(f => !!config[f]));
}
export function renderAtmo(hass: HomeAssistant, config: WeatherCardConfig, now = new Date()) {
  const includePollen = config.pollen_source !== 'none' && config.pollen_source !== 'legacy';
  const read = (metric: AtmoMetric, next: boolean) => atmoReading(hass, config[atmoField(metric, next)], !['air', ...pollutantMetrics].includes(metric), metric.endsWith('_concentration'), now);
  const badge = (r: AtmoReading, label: string, icon: string, pollen: boolean) => html`
    <span class="nw-atmo-badge" data-entity=${r.id} role="button" tabindex="0" style=${`--atmo-color:${r.color}`} title=${`${label} · ${r.label}${r.updated ? ' · publication ' + r.updated : ''}`}>
      <ha-icon icon=${icon}></ha-icon><b>${label}</b><span>${r.label}</span>${r.value === undefined ? nothing : html`<small>${r.value === 7 && !pollen ? 'code 7' : `${r.value}/6`}</small>`}
      ${r.stale ? html`<small class="nw-atmo-stale">données anciennes</small>` : nothing}
    </span>`;
  const day = (next: boolean) => {
    const air = read('air', next), pollen = includePollen ? read('pollen', next) : undefined;
    const pollution = pollutantMetrics.map(metric => ({ metric, r: read(metric, next) })).filter(v => !!v.r);
    const species = includePollen ? pollenMetrics.map(metric => ({ metric, r: read(metric, next), c: read(`${metric}_concentration` as AtmoMetric, next) })).filter(v => !!v.r || !!v.c) : [];
    const readings = [air, pollen, ...pollution.map(v => v.r), ...species.flatMap(v => [v.r, v.c])].filter((r): r is AtmoReading => !!r);
    if (!readings.length) return nothing;
    const zone = [...new Set(readings.map(r => r.zone).filter(Boolean))].join(' / ');
    const dates = [...new Set(readings.map(r => r.updated).filter(Boolean))].join(' / ');
    const body = html`<div class="nw-atmo-row">${air ? badge(air, 'Air extérieur', 'mdi:air-filter', false) : nothing}${pollen ? badge(pollen, 'Pollens', 'mdi:flower-pollen', true) : nothing}</div>
      ${config.show_atmo_details === false || config.mode === 'compact' ? nothing : html`
        ${pollution.length ? html`<div class="nw-atmo-kind">Sous-indices de pollution · échelle Atmo 1–6</div><div class="nw-atmo-row">${pollution.map(({ metric, r }) => badge(r!, atmoMetrics[metric].label.replace(' — sous-indice', ''), atmoMetrics[metric].icon, false))}</div>` : nothing}
        ${species.length ? html`<div class="nw-atmo-kind">Niveaux de pollens · échelle Atmo 1–6</div><div class="nw-atmo-row nw-atmo-species">${species.map(({ metric, r, c }) => html`<div class="nw-atmo-species-item">
          ${r ? badge(r, atmoMetrics[metric].label, atmoMetrics[metric].icon, true) : nothing}
          ${c ? html`<span class="nw-atmo-concentration" data-entity=${c.id} role="button" tabindex="0" title="Concentration déclarée par l’intégration Atmo France">
            ${!r || r.value !== undefined ? c.value === undefined ? 'Concentration indisponible' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(c.value)}${c.unit ? ' ' + c.unit : ' (unité non fournie)'}` : 'Concentration non confirmée'}
            ${c.stale ? ' · données anciennes' : ''}</span>` : nothing}</div>`)}</div>` : nothing}`}
      ${dates ? html`<div class="nw-atmo-date">Publication Atmo : ${dates}. ${readings.some(r => r.stale) ? 'Données anciennes : à vérifier dans l’intégration.' : ''}</div>` : nothing}`;
    const title = html`${next ? 'DEMAIN · J+1' : 'AIR EXTÉRIEUR ET POLLENS · AUJOURD’HUI'} <span>Atmo France${zone ? ' · ' + zone : ''}</span>`;
    return next ? html`<details class="nw-atmo-day nw-atmo-next"><summary>${title}</summary>${body}</details>`
      : html`<section class="nw-atmo-day" aria-label="Air extérieur et pollens Atmo France aujourd’hui"><div class="nw-atmo-heading">${title}</div>${body}</section>`;
  };
  return html`${day(false)}${config.show_atmo_tomorrow === false || config.mode === 'compact' ? nothing : day(true)}`;
}
export const atmoStyles = css`
  .nw-atmo-day { border-top:1px solid rgba(150,150,150,.14); padding:12px 20px; color:var(--primary-text-color); font-size:12px; }
  .nw-atmo-heading, .nw-atmo-next>summary { font-size:11px; font-weight:800; letter-spacing:.35px; }
  .nw-atmo-heading span, .nw-atmo-next>summary span { color:var(--secondary-text-color); font-weight:600; letter-spacing:0; margin-left:8px; }
  .nw-atmo-next>summary { cursor:pointer; padding:2px 0; }
  .nw-atmo-row { display:flex; flex-wrap:wrap; gap:8px 16px; margin-top:8px; min-width:0; }
  .nw-atmo-badge { display:inline-flex; flex-wrap:wrap; align-items:center; gap:5px; cursor:pointer; border-bottom:2px solid var(--atmo-color); padding:2px 0; }
  .nw-atmo-badge ha-icon { --mdc-icon-size:15px; color:var(--atmo-color); }
  .nw-atmo-badge b { font-weight:750; } .nw-atmo-badge span { color:var(--secondary-text-color); font-weight:600; }
  .nw-atmo-badge small { font-size:10px; color:var(--secondary-text-color); }
  .nw-atmo-kind, .nw-atmo-date { color:var(--secondary-text-color); font-size:10px; margin-top:10px; }
  .nw-atmo-species-item { display:flex; flex-direction:column; gap:3px; max-width:100%; }
  .nw-atmo-concentration { cursor:pointer; font-size:10px; color:var(--secondary-text-color); }
  .nw-atmo-stale { font-style:italic; } .nw-atmo-next { margin:0; }
  @container (max-width:400px) { .nw-atmo-day { padding:10px 12px; } .nw-atmo-heading span { display:block; margin:3px 0 0; } .nw-atmo-row { gap:7px 12px; } }
`;

import { css, html, nothing, svg, type TemplateResult } from 'lit';
import { finite, measurement } from './local-model';
import type { HomeAssistant, WeatherForecast } from './types';
import { dateFormat, numberFormat } from './intl-cache';

export interface ForecastSlot { hour: number; day: number; t?: number; p: number; c: string; night: boolean; w?: number; g?: number; b?: number }

const parts = (date: Date, timeZone?: string) => Object.fromEntries(dateFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));

/** The next 18 hourly points, in local time, with night flagged from today's sunrise and sunset (decimal hours). */
export function forecastSlots(hourly: WeatherForecast[], now: Date, timeZone?: string, sunrise = 6.5, sunset = 21, windUnit = 'km/h'): ForecastSlot[] {
  const today = parts(now, timeZone), serial = (p: Record<string, string>) => Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
  return hourly.map(p => ({ p, time: Date.parse(p.datetime) })).filter(x => Number.isFinite(x.time) && x.time >= now.getTime() - 30 * 60_000)
    .sort((a, b) => a.time - b.time).slice(0, 18).map(({ p, time }) => {
      const local = parts(new Date(time), timeZone), hour = +local.hour;
      return { hour, day: serial(local) - serial(today), t: finite(p.temperature), p: Math.max(0, finite(p.precipitation) ?? 0),
        c: String(p.condition ?? '').replaceAll('_', '-'), night: hour < sunrise || hour >= sunset,
        w: measurement(p.wind_speed, windUnit, 'wind'), g: measurement(p.wind_gust_speed, windUnit, 'wind'), b: finite(p.wind_bearing) };
    });
}

/** Round axis bounds on a 1/2/5 step, with three to five gridlines. */
export function temperatureScale(values: number[]): { min: number; max: number; ticks: number[] } {
  let lo = Math.min(...values), hi = Math.max(...values);
  if (hi - lo < 4) { const mid = (hi + lo) / 2; lo = mid - 2; hi = mid + 2; }
  const step = [1, 2, 5, 10].find(s => Math.ceil(hi / s) - Math.floor(lo / s) <= 4) ?? 10;
  const min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
  return { min, max, ticks: Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step) };
}
export function rainScale(peak: number): number { return [1, 2, 5, 10, 20, 50].find(v => v >= peak) ?? Math.ceil(peak / 10) * 10; }

const icons: Record<string, string> = { sunny: 'mdi:weather-sunny', 'clear-night': 'mdi:weather-night', partlycloudy: 'mdi:weather-partly-cloudy', cloudy: 'mdi:weather-cloudy',
  fog: 'mdi:weather-fog', rainy: 'mdi:weather-rainy', pouring: 'mdi:weather-pouring', lightning: 'mdi:weather-lightning', 'lightning-rainy': 'mdi:weather-lightning-rainy',
  hail: 'mdi:weather-hail', snowy: 'mdi:weather-snowy', 'snowy-rainy': 'mdi:weather-snowy-rainy', windy: 'mdi:weather-windy', 'windy-variant': 'mdi:weather-windy-variant', exceptional: 'mdi:alert-outline' };
const labels: Record<string, string> = { sunny: 'Ensoleillé', 'clear-night': 'Nuit claire', partlycloudy: 'Éclaircies', cloudy: 'Couvert', rainy: 'Pluie',
  pouring: 'Fortes pluies', lightning: 'Orage', 'lightning-rainy': 'Orage et pluie', snowy: 'Neige', 'snowy-rainy': 'Pluie et neige', hail: 'Grêle',
  fog: 'Brouillard', windy: 'Venteux', 'windy-variant': 'Venteux', exceptional: 'Exceptionnel' };

/** Same frame as the Rain / Wind / Pressure columns: temperature in °C on the left, rain in mm on the right. */
export function renderForecastChart(hass: HomeAssistant, entity: string, provider: string, hourly: WeatherForecast[], now: Date,
  sun: { sunrise?: number; sunset?: number } = {}, footer = ''): TemplateResult | undefined {
  const windUnit = String(hass.states[entity]?.attributes.wind_speed_unit ?? 'km/h');
  const slots = forecastSlots(hourly, now, hass.config?.time_zone, sun.sunrise, sun.sunset, windUnit);
  const temps = slots.map(s => s.t).filter((t): t is number => t !== undefined);
  if (slots.length < 3 || temps.length < 3) return;
  const unit = String(hass.states[entity]?.attributes.temperature_unit ?? '°C');
  const n = slots.length, X = (i: number) => (i + .5) / n * 100;
  const scale = temperatureScale(temps), Y = (t: number) => 15 + (1 - (t - scale.min) / (scale.max - scale.min)) * 78;
  const peak = Math.max(...slots.map(s => s.p)), rain = peak >= .1, rainTop = rainScale(peak), H = (p: number) => p / rainTop * 46;
  const nf = (v: number, d = 0) => numberFormat(hass.language || 'fr', { maximumFractionDigits: d }).format(v);
  const points = slots.map((s, i) => s.t === undefined ? undefined : { x: X(i), y: Y(s.t) }).filter((p): p is { x: number; y: number } => !!p);
  let line = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    line += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)},${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)},${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  const area = `${line}L${points.at(-1)!.x.toFixed(2)} 100L${points[0].x.toFixed(2)} 100Z`;
  const valid = slots.map((s, i) => ({ s, i })).filter(x => x.s.t !== undefined);
  const hi = valid.reduce((a, b) => b.s.t! > a.s.t! ? b : a), lo = valid.reduce((a, b) => b.s.t! < a.s.t! ? b : a);
  const nights: Array<[number, number]> = [];
  slots.forEach((s, i) => { if (!s.night) return; const last = nights.at(-1); if (last && last[1] === i - 1) last[1] = i; else nights.push([i, i]); });
  const midnight = slots.findIndex((s, i) => i > 0 && s.day > slots[i - 1].day);
  const marks = slots.map((s, i) => ({ s, i })).filter(x => x.s.hour % 3 === 0);
  // Same icons as the week table; night versions after sunset.
  const icon = (s: ForecastSlot) => s.night && s.c === 'sunny' ? 'mdi:weather-night' : s.night && s.c === 'partlycloudy' ? 'mdi:weather-night-partly-cloudy' : icons[s.c] ?? 'mdi:weather-cloudy';
  const sectors = ['du Nord', 'du Nord-Est', 'd’Est', 'du Sud-Est', 'du Sud', 'du Sud-Ouest', 'd’Ouest', 'du Nord-Ouest'];
  const windTip = (s: ForecastSlot) => `Vent ${s.b !== undefined ? sectors[Math.round(s.b / 45) % 8] + ' ' : ''}${nf(s.w!)} km/h${s.g !== undefined && s.g > s.w! ? `, rafales ${nf(s.g)} km/h` : ''}`;
  const point = (x: { s: ForecastSlot; i: number }, above: boolean) => html`<span class="nw-fc-dot" style=${`left:${X(x.i)}%;top:${Y(x.s.t!)}%`}></span>
    <span class=${`nw-fc-extreme ${above ? 'nw-fc-extreme--hi' : 'nw-fc-extreme--lo'}`} style=${`left:clamp(24px,${X(x.i)}%,calc(100% - 24px));top:${Y(x.s.t!)}%`}>${nf(x.s.t!)} ${unit}</span>`;
  return html`<section class="nw-history-card me-bl nw-forecast-card" style="--history-accent:61,155,233" aria-label="Prévisions des 18 prochaines heures">
    <header><h3><ha-icon icon="mdi:chart-bell-curve-cumulative"></ha-icon>18 prochaines heures</h3><span class="nw-history-source">${provider}</span></header>
    <div class="nw-fc" data-entity=${entity} role="img" aria-label=${`Températures de ${nf(lo.s.t!)} à ${nf(hi.s.t!)} ${unit}${rain ? `, pluie jusqu’à ${nf(peak, 1)} mm par heure` : ', pas de pluie prévue'}`}>
      <div class="nw-fc-tags"><span class="nw-fc-tag" style=${`left:${X(0)}%`}>Maintenant</span>${midnight > 0 ? html`<span class="nw-fc-tag nw-fc-tag--next" style=${`left:${(X(midnight) + X(midnight - 1)) / 2}%;--f:${(X(midnight) + X(midnight - 1)) / 200}`}>Demain</span>` : nothing}</div>
      <div class="nw-fc-y nw-fc-y--t">${scale.ticks.map(v => html`<span style=${`top:${Y(v)}%`}>${nf(v)} ${unit}</span>`)}</div>
      <div class="nw-fc-area">
        ${nights.map(([a, b]) => html`<i class="nw-fc-night" style=${`left:${X(a) - 50 / n}%;width:${(b - a + 1) * 100 / n}%`}></i>`)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="nw-fc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(61,155,233)" stop-opacity=".28"/><stop offset="100%" stop-color="rgb(61,155,233)" stop-opacity=".02"/></linearGradient></defs>
          ${scale.ticks.map(v => svg`<line class="nw-fc-grid" x1="0" x2="100" y1=${Y(v)} y2=${Y(v)}/>`)}
          ${rain ? slots.map((s, i) => s.p >= .1 ? svg`<rect class="nw-fc-bar" x=${X(i) - 30 / n} width=${60 / n} y=${100 - Math.max(1.5, H(s.p))} height=${Math.max(1.5, H(s.p))}/>` : nothing) : nothing}
          <path class="nw-fc-area-fill" d=${area} fill="url(#nw-fc-fill)"/>
          <path class="nw-fc-line" d=${line}/>
        </svg>
        <i class="nw-fc-now" style=${`left:${X(0)}%`}></i>
        ${midnight > 0 ? html`<i class="nw-fc-midnight" style=${`left:${(X(midnight) + X(midnight - 1)) / 2}%`}></i>` : nothing}
        ${point(hi, true)}${lo.i !== hi.i ? point(lo, false) : nothing}
      </div>
      <div class="nw-fc-y nw-fc-y--p">${rain ? [rainTop, rainTop / 2, 0].map(v => html`<span style=${`top:${100 - H(v)}%`}>${nf(v, 1)} mm</span>`) : nothing}</div>
      <div class="nw-fc-x">${marks.map(m => html`<span class="nw-fc-hour" style=${`left:${X(m.i)}%`} title=${labels[m.s.c] ?? m.s.c}>${m.s.hour} h<ha-icon icon=${icon(m.s)}></ha-icon>${m.s.w !== undefined ? html`<small class="nw-fc-wind" title=${windTip(m.s)}>${m.s.b !== undefined ? html`<ha-icon icon="mdi:navigation" style=${`transform:rotate(${Math.round((m.s.b + 180) % 360)}deg)`}></ha-icon>` : nothing}${nf(m.s.w)}</small>` : nothing}</span>`)}</div>
    </div>
    <div class="nw-fc-legend"><span class="nw-fc-legend--t">Température (${unit})</span>${slots.some(s => s.w !== undefined) ? html`<span class="nw-fc-legend--w">Vent (km/h), la flèche indique où il va</span>` : nothing}${rain ? html`<span class="nw-fc-legend--p">Pluie prévue (mm par heure)</span>` : nothing}<span class="nw-fc-legend--n">Nuit</span></div>
    ${footer ? html`<p class="nw-history-caption nw-fc-foot">${footer}</p>` : nothing}
  </section>`;
}

export const forecastChartStyles = css`
  #courbe.nw-fc-host { padding:0;border:0;background:none; }
  .nw-forecast-card { height:100%;box-sizing:border-box; }
  .nw-fc { display:grid;grid-template-columns:44px minmax(0,1fr) 44px;grid-template-rows:16px 180px 66px;margin-top:22px;cursor:pointer; }
  .nw-fc-x { grid-column:2;grid-row:3;position:relative; }
  .nw-fc-y { grid-row:2;position:relative;font-size:10px;color:var(--secondary-text-color); }
  .nw-fc-y>span { position:absolute;transform:translateY(-50%);white-space:nowrap; }
  .nw-fc-y--t>span { right:6px; }
  .nw-fc-y--p { color:rgb(27,171,175); }
  .nw-fc-y--p>span { left:6px; }
  .nw-fc-area { grid-column:2;grid-row:2;position:relative;border-bottom:1px solid var(--divider-color,rgba(150,150,150,.3)); }
  .nw-fc-area svg { position:absolute;inset:0;width:100%;height:100%;overflow:visible; }
  .nw-fc-grid { stroke:var(--divider-color,rgba(150,150,150,.25));stroke-dasharray:3 4;vector-effect:non-scaling-stroke; }
  .nw-fc-bar { fill:rgb(27,171,175);opacity:.8; }
  .nw-fc-line { fill:none;stroke:rgb(61,155,233);stroke-width:2.4;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round; }
  .nw-fc-night { position:absolute;top:0;bottom:0;background:rgba(110,125,170,.12); }
  .nw-fc-now, .nw-fc-midnight { position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--secondary-text-color);opacity:.55; }
  /* Markers get their own strip above the chart: nothing on the curve can cover them. */
  .nw-fc-tags { grid-column:2;grid-row:1;position:relative;container-type:inline-size; }
  .nw-fc-tag { position:absolute;bottom:2px;transform:translateX(-2px);font-size:9px;font-weight:650;letter-spacing:.5px;text-transform:uppercase;color:var(--secondary-text-color);white-space:nowrap;line-height:11px; }
  /* Late in the evening midnight is close to now: lift « Demain » one line when it would touch « Maintenant » (72px). */
  .nw-fc-tag--next { bottom:clamp(2px,calc((72px - var(--f) * 100cqw) * 99),14px); }
  /* The legacy layout sets #container * { white-space: normal }: chart labels must stay on one line. */
  #container .nw-fc-x>span, #container .nw-fc-y>span, #container .nw-fc-extreme, #container .nw-fc-tag, #container .nw-current-trend small { white-space:nowrap; }
  .nw-fc-dot { position:absolute;width:9px;height:9px;margin:-6px 0 0 -6px;border-radius:50%;background:rgb(61,155,233);border:2px solid var(--card-background-color,#fff); }
  .nw-fc-extreme { position:absolute;z-index:2;transform:translate(-50%,calc(-100% - 7px));padding:1px 4px;border-radius:6px;background:var(--card-background-color,#fff);font-size:12px;font-weight:700;color:var(--primary-text-color);white-space:nowrap; }
  .nw-fc-extreme--lo { transform:translate(-50%,7px); }
  .nw-fc-x>span { position:absolute;top:6px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--secondary-text-color);white-space:nowrap; }
  /* Same icons and wind as the week table: 17 px secondary icons, 11 px figures, 14 px blue arrows. */
  .nw-fc-x>span>ha-icon { --mdc-icon-size:17px;color:var(--secondary-text-color);opacity:.85; }
  .nw-fc-wind { display:flex;align-items:center;gap:2px;font-size:11px;font-weight:650;color:var(--secondary-text-color); }
  .nw-fc-wind ha-icon { --mdc-icon-size:14px;color:rgb(40,130,240); }
  .nw-fc-legend--w::before { width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:9px solid rgb(40,130,240); }
  .nw-fc-legend { display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:10px;color:var(--secondary-text-color); }
  .nw-fc-legend span::before { content:'';display:inline-block;margin-right:6px;vertical-align:middle; }
  .nw-fc-legend--t::before { width:16px;border-top:2.4px solid rgb(61,155,233); }
  .nw-fc-legend--p::before { width:8px;height:10px;border-radius:2px;background:rgb(27,171,175);opacity:.8; }
  .nw-fc-legend--n::before { width:12px;height:10px;border-radius:2px;background:rgba(110,125,170,.25); }
  .nw-fc-foot { margin-top:8px; }
  #jours .nw-jours-head { margin-bottom:12px; }
  #jours .me-ttl { display:none; }
  @container(max-width:650px) {
    .nw-fc { display:grid;grid-template-columns:44px minmax(0,1fr) 44px;grid-template-rows:16px 180px 66px;margin-top:22px;cursor:pointer; }
      .nw-forecast-card h3, #jours .nw-jours-head h3 { font-size:16px; }
    #container .nw-forecast-card .nw-history-source, #container .nw-jours-head .nw-history-source { white-space:nowrap; }
  }
`;

import { css, html, nothing, svg, type TemplateResult } from 'lit';
import { finite } from './local-model';
import type { HomeAssistant, WeatherForecast } from './types';

export interface ForecastSlot { hour: number; day: number; t?: number; p: number; c: string; night: boolean }

const parts = (date: Date, timeZone?: string) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));

/** The next 18 hourly points, in local time, with night flagged from today's sunrise and sunset (decimal hours). */
export function forecastSlots(hourly: WeatherForecast[], now: Date, timeZone?: string, sunrise = 6.5, sunset = 21): ForecastSlot[] {
  const today = parts(now, timeZone), serial = (p: Record<string, string>) => Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
  return hourly.map(p => ({ p, time: Date.parse(p.datetime) })).filter(x => Number.isFinite(x.time) && x.time >= now.getTime() - 30 * 60_000)
    .sort((a, b) => a.time - b.time).slice(0, 18).map(({ p, time }) => {
      const local = parts(new Date(time), timeZone), hour = +local.hour;
      return { hour, day: serial(local) - serial(today), t: finite(p.temperature), p: Math.max(0, finite(p.precipitation) ?? 0),
        c: String(p.condition ?? '').replaceAll('_', '-'), night: hour < sunrise || hour >= sunset };
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

/** Small coloured weather glyphs drawn in the card's own style (32 × 32), so the hours read at a glance. */
export function weatherGlyph(condition: string, night: boolean): TemplateResult {
  const cloud = (x = 0, y = 0, s = 1, tone = 'nw-g-cloud') => svg`<path class=${tone} transform=${`translate(${x} ${y}) scale(${s})`} d="M9 25C5.7 25 3 22.6 3 19.6C3 16.9 5 14.7 7.7 14.3C8.4 10.6 11.6 8 15.4 8C19 8 22 10.4 22.9 13.7C23.4 13.6 23.9 13.5 24.4 13.5C27.5 13.5 30 16 30 19.2C30 22.4 27.5 25 24.4 25Z"/>`;
  const sun = (x: number, y: number, r: number) => svg`<g class="nw-g-sun"><circle cx=${x} cy=${y} r=${r}/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => svg`<line x1=${x} y1=${y - r - 2} x2=${x} y2=${y - r - 4.5} transform=${`rotate(${a} ${x} ${y})`}/>`)}</g>`;
  const moon = (x: number, y: number, r: number) => svg`<path class="nw-g-moon" d=${`M${x + r * .35} ${y - r}A${r} ${r} 0 1 0 ${x + r} ${y + r * .35}A${r * .8} ${r * .8} 0 0 1 ${x + r * .35} ${y - r}Z`}/>`;
  const drops = (n: number) => svg`${Array.from({ length: n }, (_, i) => svg`<line class="nw-g-drop" x1=${10 + i * (12 / Math.max(1, n - 1))} y1="26.5" x2=${8.5 + i * (12 / Math.max(1, n - 1))} y2="30.5"/>`)}`;
  const flakes = (n: number) => svg`${Array.from({ length: n }, (_, i) => svg`<circle class="nw-g-flake" cx=${10 + i * 6} cy=${28.5 + (i % 2)} r="1.5"/>`)}`;
  const bolt = svg`<path class="nw-g-bolt" d="M17.5 21 13.5 27.5H16.5L14.5 32 20.5 25H17.2L19.5 21Z"/>`;
  const body: Record<string, TemplateResult> = {
    sunny: night ? moon(16, 16, 8) : sun(16, 16, 6.5),
    'clear-night': moon(16, 16, 8),
    partlycloudy: svg`${night ? moon(12, 11, 6) : sun(11, 11, 5)}${cloud(2, 4, .85)}`,
    cloudy: svg`${cloud(-2, -3, .8, 'nw-g-cloud nw-g-cloud--back')}${cloud(1, 2, .92)}`,
    rainy: svg`${cloud(0, -3, .95)}${drops(3)}`,
    pouring: svg`${cloud(0, -3, .95, 'nw-g-cloud nw-g-cloud--dark')}${drops(5)}`,
    lightning: svg`${cloud(0, -4, .95, 'nw-g-cloud nw-g-cloud--dark')}${bolt}`,
    'lightning-rainy': svg`${cloud(0, -4, .95, 'nw-g-cloud nw-g-cloud--dark')}${drops(2)}${bolt}`,
    snowy: svg`${cloud(0, -3, .95)}${flakes(3)}`,
    'snowy-rainy': svg`${cloud(0, -3, .95)}<line class="nw-g-drop" x1="11" y1="26.5" x2="9.5" y2="30.5"/>${flakes(2)}`,
    hail: svg`${cloud(0, -3, .95)}${flakes(3)}`,
    fog: svg`${cloud(0, -6, .85, 'nw-g-cloud nw-g-cloud--back')}${[19, 23.5, 28].map((y, i) => svg`<line class="nw-g-fog" x1=${4 + i * 2} y1=${y} x2=${28 - i * 2} y2=${y}/>`)}`,
    windy: svg`${[10, 16, 22].map((y, i) => svg`<path class="nw-g-wind" d=${`M4 ${y}H${20 - i * 3}c4 0 4-5 0-5`}/>`)}`,
    'windy-variant': svg`${cloud(0, -5, .85)}${[22, 27].map(y => svg`<path class="nw-g-wind" d=${`M5 ${y}H20c3.5 0 3.5-4 0-4`}/>`)}`,
  };
  return svg`<svg class="nw-glyph" viewBox="0 0 32 33" aria-hidden="true">${body[condition] ?? cloud(0, 0, .95)}</svg>`;
}

const labels: Record<string, string> = { sunny: 'Ensoleillé', 'clear-night': 'Nuit claire', partlycloudy: 'Éclaircies', cloudy: 'Couvert', rainy: 'Pluie',
  pouring: 'Fortes pluies', lightning: 'Orage', 'lightning-rainy': 'Orage et pluie', snowy: 'Neige', 'snowy-rainy': 'Pluie et neige', hail: 'Grêle',
  fog: 'Brouillard', windy: 'Venteux', 'windy-variant': 'Venteux', exceptional: 'Exceptionnel' };

/** Same frame as the Rain / Wind / Pressure columns: temperature in °C on the left, rain in mm on the right. */
export function renderForecastChart(hass: HomeAssistant, entity: string, provider: string, hourly: WeatherForecast[], now: Date,
  sun: { sunrise?: number; sunset?: number } = {}, footer = ''): TemplateResult | undefined {
  const slots = forecastSlots(hourly, now, hass.config?.time_zone, sun.sunrise, sun.sunset);
  const temps = slots.map(s => s.t).filter((t): t is number => t !== undefined);
  if (slots.length < 3 || temps.length < 3) return;
  const unit = String(hass.states[entity]?.attributes.temperature_unit ?? '°C');
  const n = slots.length, X = (i: number) => (i + .5) / n * 100;
  const scale = temperatureScale(temps), Y = (t: number) => 8 + (1 - (t - scale.min) / (scale.max - scale.min)) * 84;
  const peak = Math.max(...slots.map(s => s.p)), rain = peak >= .1, rainTop = rainScale(peak), H = (p: number) => p / rainTop * 46;
  const nf = (v: number, d = 0) => new Intl.NumberFormat(hass.language || 'fr', { maximumFractionDigits: d }).format(v);
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
  const point = (x: { s: ForecastSlot; i: number }, above: boolean) => html`<span class="nw-fc-dot" style=${`left:${X(x.i)}%;top:${Y(x.s.t!)}%`}></span>
    <span class=${`nw-fc-extreme ${above ? 'nw-fc-extreme--hi' : 'nw-fc-extreme--lo'}`} style=${`left:clamp(24px,${X(x.i)}%,calc(100% - 24px));top:${Y(x.s.t!)}%`}>${nf(x.s.t!)} ${unit}</span>`;
  return html`<section class="nw-history-card me-bl nw-forecast-card" style="--history-accent:61,155,233" aria-label="Prévisions des 18 prochaines heures">
    <header><h3><ha-icon icon="mdi:chart-bell-curve-cumulative"></ha-icon>18 prochaines heures</h3><span class="nw-history-source">${provider}</span></header>
    <div class="nw-fc" data-entity=${entity} role="img" aria-label=${`Températures de ${nf(lo.s.t!)} à ${nf(hi.s.t!)} ${unit}${rain ? `, pluie jusqu’à ${nf(peak, 1)} mm par heure` : ', pas de pluie prévue'}`}>
      <div class="nw-fc-icons">${marks.map(m => html`<span style=${`left:${X(m.i)}%`} title=${labels[m.s.c] ?? m.s.c}>${weatherGlyph(m.s.c, m.s.night)}</span>`)}</div>
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
        <i class="nw-fc-now" style=${`left:${X(0)}%`}></i><span class="nw-fc-tag" style=${`left:${X(0)}%`}>Maintenant</span>
        ${midnight > 0 ? html`<i class="nw-fc-midnight" style=${`left:${(X(midnight) + X(midnight - 1)) / 2}%`}></i><span class="nw-fc-tag nw-fc-tag--low" style=${`left:${(X(midnight) + X(midnight - 1)) / 2}%`}>Demain</span>` : nothing}
        ${point(hi, true)}${lo.i !== hi.i ? point(lo, false) : nothing}
      </div>
      <div class="nw-fc-y nw-fc-y--p">${rain ? [rainTop, rainTop / 2, 0].map(v => html`<span style=${`top:${100 - H(v)}%`}>${nf(v, 1)} mm</span>`) : nothing}</div>
      <div class="nw-fc-x">${marks.map(m => html`<span style=${`left:${X(m.i)}%`}>${m.s.hour} h</span>`)}</div>
    </div>
    <div class="nw-fc-legend"><span class="nw-fc-legend--t">Température (${unit})</span>${rain ? html`<span class="nw-fc-legend--p">Pluie prévue (mm par heure)</span>` : nothing}<span class="nw-fc-legend--n">Nuit</span></div>
    ${footer ? html`<p class="nw-history-caption nw-fc-foot">${footer}</p>` : nothing}
  </section>`;
}

export const forecastChartStyles = css`
  #courbe.nw-fc-host { padding:0;border:0;background:none; }
  .nw-forecast-card { height:100%;box-sizing:border-box; }
  .nw-fc { display:grid;grid-template-columns:44px minmax(0,1fr) 44px;grid-template-rows:34px 170px 22px;margin-top:14px;cursor:pointer; }
  .nw-fc-icons, .nw-fc-x { grid-column:2;position:relative; }
  .nw-fc-icons>span { position:absolute;top:0;transform:translateX(-50%);display:flex; }
  .nw-glyph { width:30px;height:31px;overflow:visible; }
  .nw-g-cloud { fill:#eef3f7;stroke:rgba(90,110,130,.35);stroke-width:.8; }
  .nw-g-cloud--back { fill:#c9d4de; }
  .nw-g-cloud--dark { fill:#9fb0c1; }
  .nw-g-sun circle { fill:#f6c343; }
  .nw-g-sun line { stroke:#f6c343;stroke-width:1.8;stroke-linecap:round; }
  .nw-g-moon { fill:#ece6c4; }
  .nw-g-drop { stroke:#3d9be9;stroke-width:2;stroke-linecap:round; }
  .nw-g-flake { fill:#8fc3f0; }
  .nw-g-bolt { fill:#f6c343;stroke:#d79a12;stroke-width:.6; }
  .nw-g-fog { stroke:#9aa8b5;stroke-width:2;stroke-linecap:round; }
  .nw-g-wind { fill:none;stroke:#7fa6c9;stroke-width:2;stroke-linecap:round; }
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
  .nw-fc-tag { position:absolute;top:0;line-height:11px;transform:translateX(4px);font-size:9px;font-weight:650;letter-spacing:.5px;text-transform:uppercase;color:var(--secondary-text-color);white-space:nowrap; }
  .nw-fc-tag--low { top:13px; }
  /* The legacy layout sets #container * { white-space: normal }: chart labels must stay on one line. */
  #container .nw-fc-x>span, #container .nw-fc-y>span, #container .nw-fc-extreme, #container .nw-fc-tag, #container .nw-current-trend small { white-space:nowrap; }
  .nw-fc-dot { position:absolute;width:9px;height:9px;margin:-6px 0 0 -6px;border-radius:50%;background:rgb(61,155,233);border:2px solid var(--card-background-color,#fff); }
  .nw-fc-extreme { position:absolute;z-index:2;transform:translate(-50%,calc(-100% - 7px));padding:1px 4px;border-radius:6px;background:var(--card-background-color,#fff);font-size:12px;font-weight:700;color:var(--primary-text-color);white-space:nowrap; }
  .nw-fc-extreme--lo { transform:translate(-50%,7px); }
  .nw-fc-x>span { position:absolute;top:6px;transform:translateX(-50%);font-size:10px;color:var(--secondary-text-color);white-space:nowrap; }
  .nw-fc-legend { display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:10px;color:var(--secondary-text-color); }
  .nw-fc-legend span::before { content:'';display:inline-block;margin-right:6px;vertical-align:middle; }
  .nw-fc-legend--t::before { width:16px;border-top:2.4px solid rgb(61,155,233); }
  .nw-fc-legend--p::before { width:8px;height:10px;border-radius:2px;background:rgb(27,171,175);opacity:.8; }
  .nw-fc-legend--n::before { width:12px;height:10px;border-radius:2px;background:rgba(110,125,170,.25); }
  .nw-fc-foot { margin-top:8px; }
  #jours .nw-jours-head { margin-bottom:12px; }
  #jours .me-ttl { display:none; }
  @container(max-width:650px) {
    .nw-fc { grid-template-columns:38px minmax(0,1fr) 36px;grid-template-rows:30px 150px 22px; }
    .nw-glyph { width:24px;height:25px; }
    .nw-forecast-card h3, #jours .nw-jours-head h3 { font-size:16px; }
    #container .nw-forecast-card .nw-history-source, #container .nw-jours-head .nw-history-source { white-space:nowrap; }
  }
`;

import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { forecastsFromResponse } from './engine/forecast';
import { buildWeatherBrief, type BriefPoint } from './engine/weather-brief';
import { buildLocalModel, finite, measurement, normaliseForecasts, type History } from './engine/local-model';
import { currentSeason } from './engine/season';
import { deriveStation, periodStarts, type StationArchive, type Statistic } from './engine/station-history';
import { buildView, type WeatherView } from './engine/view-model';
import { detectEcowittStation } from './editor/station-detection';
import { cleanConfig } from './config';
import { bubbles, pieces, tokens } from './ui/charter';
import { renderTile, tileStyles } from './views/tile';
import { fullStyles, renderFull, type SectionId } from './views/full';
import { heroStyles } from './views/hero';
import { todayStyles } from './views/today';
import { forecastStyles } from './views/forecasts';
import { airStyles } from './views/air';
import './ui/weather-sky';
import './editor/niak-weather-card-editor';
import type { ForecastResponse, HomeAssistant, WeatherCardConfig, WeatherForecast } from './types';

const HOLD_MS = 500;
/** Phones and tablets: unless set otherwise, the tile's sky is lightened (fewer drops, clouds and leaves); its drawing is scaled down there anyway. */
const LIGHT_SKY = matchMedia('(pointer: coarse)');
let instances = 0;

@customElement('niak-weather-card')
export class NiakWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: WeatherCardConfig;
  @state() private hourly: WeatherForecast[] = [];
  @state() private daily: WeatherForecast[] = [];
  @state() private history: History = {};
  @state() private rainHistory: History = {};
  @state() private stationArchive: StationArchive = { rain: [], counter: {} };
  /** The tile is unfolded (remembered on this device). */
  @state() private open = false;
  @state() private tab: 'hours' | 'days' = 'hours';
  /** The full card is shown over the page, after a long press on the tile. */
  @state() private dialogOpen = false;
  @state() private folded: Record<SectionId, boolean> = { today: false, predictions: false };
  private readonly uid = `nw${++instances}`;
  private archiveAt = 0; private archivePending = false; private archiveGeneration = 0;
  private forecastGeneration = 0; private historyGeneration = 0; private rainGeneration = 0;
  private forecastAt = 0; private historyAt = 0; private rainHistoryAt = 0;
  private rainHistoryPending = false; private forecastPending = false; private historyPending = false;
  private timer?: ReturnType<typeof setInterval>;
  private press?: { x: number; y: number; long: boolean; timer: ReturnType<typeof setTimeout>; frame: number };
  private hassSnapshot = '';

  public setConfig(config: WeatherCardConfig): void {
    if (!config.weather_entity?.startsWith('weather.')) throw new Error('Choisissez une entité météo (weather.*) pour Niak Weather.');
    const next = cleanConfig(config), old = this.config;
    if (old && JSON.stringify(old) === JSON.stringify(next)) return;
    this.config = next;
    if (old?.show_today === false && next.show_today !== false) { this.historyAt = 0; this.rainHistoryAt = 0; }
    if (!old || old.collapse_today !== next.collapse_today || old.collapse_predictions !== next.collapse_predictions)
      this.folded = { today: next.collapse_today === true, predictions: next.collapse_predictions === true };
    if (!old || old.format !== next.format || old.weather_entity !== next.weather_entity) this.open = this.remembered(next);
    // Cosmetic edits must not clear graphs and launch new forecast/history requests.
    if (!old || old.weather_entity !== next.weather_entity) {
      this.forecastGeneration++; this.hourly = []; this.daily = []; this.forecastAt = 0; this.forecastPending = false;
    }
    if (!old || old.pressure_entity !== next.pressure_entity || old.wind_speed_entity !== next.wind_speed_entity || old.wind_gust_entity !== next.wind_gust_entity
      || old.temperature_entity !== next.temperature_entity || old.station_history !== next.station_history || old.max_daily_gust_entity !== next.max_daily_gust_entity) {
      const retained = new Set([next.pressure_entity, next.wind_speed_entity, next.wind_gust_entity, next.temperature_entity]);
      this.historyGeneration++; this.history = Object.fromEntries(Object.entries(this.history).filter(([id]) => retained.has(id))); this.historyAt = 0; this.historyPending = false;
    }
    if (!old || old.daily_rain_entity !== next.daily_rain_entity || old.rain_total_entity !== next.rain_total_entity || old.station_history !== next.station_history) {
      this.rainGeneration++; this.rainHistory = {}; this.rainHistoryAt = 0; this.rainHistoryPending = false;
      this.archiveGeneration++; this.stationArchive = { rain: [], counter: {} }; this.archiveAt = 0; this.archivePending = false;
    }
  }
  public static getStubConfig(hass?: HomeAssistant): WeatherCardConfig {
    const weather = Object.keys(hass?.states ?? {}).find(id => id.startsWith('weather.')) ?? '';
    return { type: 'custom:niak-weather-card', weather_entity: weather };
  }
  public static getConfigElement(): HTMLElement { return document.createElement('niak-weather-card-editor'); }
  public getCardSize(): number {
    if (!this.config) return 10;
    if (this.tile) return this.open ? 7 : 2;
    return Math.max(1, (this.config.show_synthesis === false ? 0 : 4) + (this.config.show_today === false ? 0 : 5) + (this.config.show_predictions === false ? 0 : 4));
  }
  public getGridOptions() { return this.tile ? { columns: 12, rows: 'auto', min_columns: 6 } : { columns: 'full', rows: 'auto' }; }

  /** Tile and intermediate formats: one band that unfolds; the full card is the weather page. */
  private get tile(): boolean { return !!this.config?.format && this.config.format !== 'full'; }
  /** The Today section is on screen, or about to be: rain history and statistics are needed. */
  private get showsToday(): boolean { return this.config?.show_today !== false && (!this.tile || this.dialogOpen); }
  private key(config = this.config!) { return `niak-weather:open:${config.format}:${config.weather_entity}`; }
  private remembered(config: WeatherCardConfig): boolean {
    try { const v = localStorage.getItem(this.key(config)); if (v !== null) return v === '1'; } catch { /* private browsing */ }
    return config.format === 'intermediate';
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.timer = setInterval(() => { this.requestUpdate(); }, 60_000);
    this.forecastAt = 0; this.historyAt = 0; this.rainHistoryAt = 0; this.archiveAt = 0;
  }
  public disconnectedCallback(): void {
    super.disconnectedCallback(); clearInterval(this.timer); this.cancelPress();
    this.forecastGeneration++; this.historyGeneration++; this.rainGeneration++; this.archiveGeneration++;
    this.forecastPending = false; this.historyPending = false; this.rainHistoryPending = false; this.archivePending = false;
  }
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!this.hass || !this.config) return true;
    const ids = Object.values(this.config).filter((v): v is string => typeof v === 'string' && /^(sensor|weather|sun|binary_sensor)\./.test(v));
    ids.push(this.config.sun_entity || 'sun.sun', ...(this.config.season_entity ? [this.config.season_entity] : []), ...(this.config.pollens ?? []).map(p => p.id));
    const snapshot = JSON.stringify([this.hass.language, this.hass.config?.time_zone, ...ids.map(id => this.hass!.states[id])]);
    const different = snapshot !== this.hassSnapshot; this.hassSnapshot = snapshot;
    return changed.size !== 1 || !changed.has('hass') || different;
  }
  protected updated(): void {
    if (this.isConnected) { void this.loadForecasts(); void this.loadHistory(); void this.loadRainHistory(); void this.loadStationArchive(); }
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>('dialog');
    if (dialog && this.dialogOpen && !dialog.open) dialog.showModal();
  }

  private async loadForecasts(): Promise<void> {
    if (!this.hass || !this.config || this.forecastPending || Date.now() - this.forecastAt < 900_000) return;
    this.forecastPending = true; this.forecastAt = Date.now();
    const generation = this.forecastGeneration, id = this.config.weather_entity, hass = this.hass;
    const request = (type: 'hourly' | 'daily') => hass.callWS<ForecastResponse>({ type: 'call_service', domain: 'weather', service: 'get_forecasts',
      service_data: { type }, target: { entity_id: id }, return_response: true });
    const results = await Promise.allSettled([request('hourly'), request('daily')]);
    if (generation !== this.forecastGeneration || !this.isConnected) return;
    this.forecastPending = false;
    const weather = hass.states[id];
    const convert = (rows: WeatherForecast[]) => rows.map(p => ({ ...p,
      temperature: measurement(p.temperature, weather?.attributes.temperature_unit, 'temperature'),
      templow: measurement(p.templow, weather?.attributes.temperature_unit, 'temperature'),
      precipitation: measurement(p.precipitation, weather?.attributes.precipitation_unit, 'rain') }));
    this.hourly = results[0].status === 'fulfilled' ? convert(forecastsFromResponse(results[0].value, id)) : [];
    this.daily = results[1].status === 'fulfilled' ? convert(forecastsFromResponse(results[1].value, id)) : [];
    if (results.some(r => r.status === 'rejected')) this.forecastAt = Date.now() - 840_000; // Retry failures in 1 minute.
  }
  private async loadHistory(): Promise<void> {
    if (!this.hass || !this.config || this.historyPending || Date.now() - this.historyAt < 300_000) return;
    const derived = this.config.station_history !== false;
    const ids = [...new Set([this.config.pressure_entity, this.config.wind_speed_entity, this.config.show_today === false ? undefined : this.config.wind_gust_entity,
      derived && !this.config.temperature_trend_entity ? this.config.temperature_entity : undefined].filter((id): id is string => !!id))];
    if (!ids.length) return;
    this.historyPending = true; this.historyAt = Date.now();
    const generation = this.historyGeneration;
    try {
      const today = periodStarts(new Date(), this.hass.config?.time_zone ?? 'UTC').day;
      const start = derived && !this.config.max_daily_gust_entity && this.config.wind_gust_entity ? Math.min(today, Date.now() - 21600_000) : Date.now() - 21600_000;
      const result = await this.hass.callWS<History>({ type: 'history/history_during_period', start_time: new Date(start).toISOString(),
        end_time: new Date().toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
      if (generation === this.historyGeneration && this.isConnected) this.history = result;
    } catch { /* Recorder may exclude the entities. No invented trend: the card says it's being measured. */ }
    finally { if (generation === this.historyGeneration) this.historyPending = false; }
  }
  private async loadRainHistory(): Promise<void> {
    if (!this.hass || !this.config || !this.showsToday || this.rainHistoryPending || Date.now() - this.rainHistoryAt < 900_000) return;
    const ids = [this.config.daily_rain_entity, this.config.station_history !== false ? this.config.rain_total_entity : undefined].filter((id): id is string => !!id);
    if (!ids.length) return;
    this.rainHistoryPending = true; this.rainHistoryAt = Date.now();
    const generation = this.rainGeneration;
    try {
      const result = await this.hass.callWS<History>({ type: 'history/history_during_period', start_time: new Date(Date.now() - 8 * 86400_000).toISOString(),
        end_time: new Date().toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
      if (generation === this.rainGeneration && this.isConnected) this.rainHistory = result;
    } catch { /* Optional Recorder history: never invent missing daily totals. */ }
    finally { if (generation === this.rainGeneration) this.rainHistoryPending = false; }
  }
  private async loadStationArchive(): Promise<void> {
    const hass = this.hass, config = this.config, id = config?.rain_total_entity;
    if (!hass || !config || !id || config.station_history === false || !this.showsToday || this.archivePending || Date.now() - this.archiveAt < 900_000) return;
    if (hass.states[id]?.attributes.state_class !== 'total_increasing') return;
    this.archivePending = true; this.archiveAt = Date.now(); const generation = this.archiveGeneration;
    try {
      const metadata = await hass.callWS<Array<{ statistic_id: string; has_sum: boolean; statistics_unit_of_measurement?: string | null; display_unit_of_measurement?: string | null }>>(
        { type: 'recorder/get_statistics_metadata', statistic_ids: [id] });
      const meta = Array.isArray(metadata) ? metadata.find(m => m.statistic_id === id && m.has_sum) : undefined;
      // Without `units`, HA returns values converted to the display unit (the entity's current unit when convertible).
      const unit = meta?.display_unit_of_measurement ?? meta?.statistics_unit_of_measurement;
      if (!meta || !unit || !['mm', 'in', 'inch'].includes(unit)) return;
      const now = new Date(), timeZone = hass.config?.time_zone ?? 'UTC', year = periodStarts(now, timeZone).year;
      // Hourly rows start on a local midnight, where a daily row ends: no false gap at the junction.
      const hourly = periodStarts(new Date(now.getTime() - 9 * 86400_000), timeZone).day;
      const common = { type: 'recorder/statistics_during_period', end_time: now.toISOString(), statistic_ids: [id], types: ['sum', 'state'] };
      const results = await Promise.allSettled([
        hass.callWS<Record<string, Statistic[]>>({ ...common, start_time: new Date(Math.min(year, now.getTime() - 8 * 86400_000) - 86400_000).toISOString(), period: 'day' }),
        hass.callWS<Record<string, Statistic[]>>({ ...common, start_time: new Date(hourly).toISOString(), period: 'hour' })]);
      if (generation !== this.archiveGeneration || !this.isConnected) return;
      const rows = results.flatMap(r => r.status === 'fulfilled' && Array.isArray(r.value[id]) ? r.value[id] : []);
      const ordered = [...new Map(rows.sort((a, b) => (b.end - b.start) - (a.end - a.start)).map(r => [r.end, r])).values()].sort((a, b) => a.end - b.end);
      this.stationArchive = { rain: ordered, rainUnit: unit, counter: {} };
    } catch { /* Unsupported statistics/Recorder exclusion: keep missing data honest. */ }
    finally { if (generation === this.archiveGeneration) this.archivePending = false; }
  }

  /** Everything the views show, computed once per update. */
  private view(now: Date): WeatherView {
    const config = this.config!, hass = this.hass!;
    const forecast = normaliseForecasts(this.hourly, this.daily, now, hass.config?.time_zone, String(hass.states[config.weather_entity]?.attributes.wind_speed_unit ?? 'km/h'));
    const hourly = forecast.heures.map(p => ({ datetime: '', temperature: finite(p.t), precipitation: finite(p.p), condition: p.c }));
    const derived = config.station_history === false ? undefined : deriveStation(hass, config, { ...this.stationArchive, counter: this.rainHistory }, this.history, now);
    const model = buildLocalModel(hass, config, hourly, this.history, now);
    if (derived?.temperatureTrend !== undefined && config.temperature_trend_entity === undefined) {
      model.attributes.tend_temp = derived.temperatureTrend; (model.attributes.sources as Record<string, string>).tend_temp = config.temperature_entity!;
    }
    const windUnit = String(hass.states[config.weather_entity]?.attributes.wind_speed_unit ?? 'km/h');
    const points: BriefPoint[] = this.hourly.map(p => ({ hours: (Date.parse(p.datetime) - now.getTime()) / 3600_000, temperature: p.temperature, precipitation: p.precipitation,
      condition: p.condition, wind: measurement(p.wind_speed, windUnit, 'wind'), humidity: finite(p.humidity) }));
    // The tile is the brief: it is always built for it. On the full card it can be switched off.
    const brief = !this.tile && (config.smart_brief === false || config.show_synthesis === false) ? undefined : buildWeatherBrief(hass, config, model, points, now, this.daily);
    return buildView({ hass, config, model, brief, hourly: this.hourly, daily: this.daily, history: this.history, rainHistory: this.rainHistory, derived, now });
  }

  protected render() {
    if (!this.hass || !this.config) return nothing;
    const config = this.config, hass = this.hass, now = new Date(), view = this.view(now);
    const sky = html`<niak-weather-sky .condition=${view.now.condition} .phase=${view.now.phase} .animated=${config.weather_animations !== false}
      .quality=${config.weather_animation_quality ?? (this.tile && LIGHT_SKY.matches ? 'low' : 'standard')} .wind=${view.now.wind ?? 0} .season=${currentSeason(hass, config, now).season}></niak-weather-sky>`;
    const full = () => renderFull(view, { sky, uid: this.uid, entity: config.weather_entity, station: !!config.temperature_entity,
      show: { synthesis: config.show_synthesis !== false, today: config.show_today !== false, predictions: config.show_predictions !== false },
      folded: this.folded, onFold: id => { this.folded = { ...this.folded, [id]: !this.folded[id] }; } });
    if (!this.tile) return html`<ha-card @click=${this.openEntity} @keydown=${this.entityKey}>${full()}</ha-card>`;
    const title = `Météo${view.location ? ` · ${view.location}` : ''}`;
    return html`<ha-card>
      <div @pointerdown=${this.down} @pointermove=${this.move} @pointerup=${this.up} @pointercancel=${this.cancelPress} @pointerleave=${this.cancelPress}
        @contextmenu=${this.noMenu} @keydown=${this.tileKey}>
        ${renderTile(view, sky, { open: this.open, tab: this.tab, holdTarget: this.weatherPath ? 'page' : 'card', onTab: tab => { this.tab = tab; } })}</div>
      ${this.dialogOpen ? html`<dialog class="nw-dialog" aria-label=${title} @close=${() => { this.dialogOpen = false; }} @click=${this.openEntity} @keydown=${this.entityKey}>
        <header><b>${title}</b><button type="button" @click=${this.closeDialog}>Fermer</button></header>${full()}</dialog>` : nothing}
    </ha-card>`;
  }

  /** The user's weather page, when one is set: a long press goes there instead of opening the full card. */
  private get weatherPath(): string | undefined {
    const path = this.config?.weather_path;
    return path?.startsWith('/') && !path.startsWith('//') ? path : undefined;
  }
  private tileCard() { return this.renderRoot.querySelector<HTMLElement>('.nw-tilecard'); }
  /** Tap: unfold or fold. Long press (½ s): the full card. Sliding cancels both. */
  private down = (e: PointerEvent) => {
    const card = this.tileCard();
    if (e.button !== 0 || !card) return;
    this.cancelPress();
    const ring = card.querySelector<HTMLElement>('.press-ring'), r = card.getBoundingClientRect(), start = performance.now();
    ring?.style.setProperty('left', `${e.clientX - r.left}px`); ring?.style.setProperty('top', `${e.clientY - r.top}px`);
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / HOLD_MS);
      ring?.style.setProperty('--p', String(p)); card.classList.toggle('pressing', p > .15);
      if (p < 1 && this.press) this.press.frame = requestAnimationFrame(tick);
    };
    this.press = { x: e.clientX, y: e.clientY, long: false, frame: requestAnimationFrame(tick),
      timer: setTimeout(() => { if (!this.press) return; this.press.long = true; this.stopRing(); this.hold(); }, HOLD_MS) };
  };
  private move = (e: PointerEvent) => { if (this.press && Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 10) this.cancelPress(); };
  private up = () => { const press = this.press; this.cancelPress(); if (press && !press.long) this.toggle(); };
  private stopRing() {
    if (!this.press) return;
    clearTimeout(this.press.timer); cancelAnimationFrame(this.press.frame);
    this.tileCard()?.classList.remove('pressing');
  }
  private cancelPress = () => { this.stopRing(); this.press = undefined; };
  /** A long press on a phone also opens the browser menu: not on the card. */
  private noMenu = (e: Event) => e.preventDefault();
  private tileKey = (e: KeyboardEvent) => {
    if (e.target !== this.tileCard() || !['Enter', ' '].includes(e.key)) return;
    e.preventDefault();
    if (e.shiftKey) this.hold(); else this.toggle();
  };
  private toggle() {
    this.open = !this.open;
    try { localStorage.setItem(this.key(), this.open ? '1' : '0'); } catch { /* private browsing */ }
  }
  private hold() {
    const path = this.weatherPath;
    if (path) { history.pushState(null, '', path); window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true })); return; }
    this.dialogOpen = true;
  }
  private closeDialog = () => { this.renderRoot.querySelector('dialog')?.close(); };
  /** A value of the full card opens its sensor's details, like the rest of Home Assistant. */
  private openEntity = (e: Event) => {
    const target = e.composedPath().find((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-entity'));
    if (!target || target.closest('.nw-tilecard')) return;
    // Home Assistant's details window would open under ours: close ours first.
    this.closeDialog();
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: target.getAttribute('data-entity') }, bubbles: true, composed: true }));
  };
  private entityKey = (e: KeyboardEvent) => {
    if (!['Enter', ' '].includes(e.key) || !(e.target instanceof HTMLElement) || !e.target.hasAttribute('data-entity')) return;
    e.preventDefault(); this.openEntity(e);
  };

  static styles = [tokens, pieces, bubbles, tileStyles, heroStyles, fullStyles, todayStyles, forecastStyles, airStyles, css`
    :host { display:block; }
    ha-card { padding:0; overflow:hidden; container-type:inline-size; }
    dialog.nw-dialog { border:0; padding:0; width:min(1180px, 96vw); max-height:92vh; border-radius:16px; overflow:auto; overscroll-behavior:contain;
      background:var(--nw-bg); color:var(--nw-fg); box-shadow:0 24px 80px #0005; }
    dialog.nw-dialog::backdrop { background:#0b1520aa; backdrop-filter:blur(2px); }
    .nw-dialog > header { position:sticky; top:0; z-index:3; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px;
      background:var(--nw-bg); border-bottom:1px solid var(--nw-line-soft); font-size:var(--nw-fs-text); }
    .nw-dialog > header button { border:1px solid var(--nw-line); background:var(--nw-bg); border-radius:var(--nw-radius-pill); padding:5px 14px; cursor:pointer; font-size:var(--nw-fs-small); font-weight:600; }
    @media (max-width:600px) { dialog.nw-dialog { width:100vw; max-width:100vw; height:100dvh; max-height:100dvh; border-radius:0; margin:0; } }
  `];
}

window.customCards = window.customCards || [];
window.customCards.push({ type: 'niak-weather-card', name: 'Niak Weather', description: 'Météo locale Ecowitt et prévisions', preview: true,
  getEntitySuggestion: (hass: HomeAssistant, entityId: string) => entityId.startsWith('weather.') ? {
    config: { type: 'custom:niak-weather-card', weather_entity: entityId, ...detectEcowittStation(hass) } } : null });
declare global { interface Window { customCards: Array<Record<string, unknown>>; } }

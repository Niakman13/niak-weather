import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { forecastsFromResponse } from './forecast';
import { buildWeatherBrief, type BriefPoint } from './weather-brief';
import { buildLocalModel, finite, measurement, normaliseForecasts, type History } from './local-model';
import { renderLocal } from './local-renderer';
import { localStyles } from './local-styles';
import { detectEcowittStation } from './station-detection';
import { cleanConfig } from './config';
import './niak-weather-card-editor';
import { atmoStyles, usesAtmoPollens } from './atmo-view';
import { dashboardStyles, renderDashboard } from './dashboard-view';
import type { ForecastResponse, HassEntity, HomeAssistant, WeatherCardConfig, WeatherForecast } from './types';

@customElement('niak-weather-card')
export class NiakWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: WeatherCardConfig;
  @state() private hourly: WeatherForecast[] = [];
  @state() private daily: WeatherForecast[] = [];
  @state() private history: History = {};
  private generation = 0;
  private forecastAt = 0;
  private historyAt = 0;
  private forecastPending = false;
  private historyPending = false;
  private timer?: ReturnType<typeof setInterval>;
  private holdTimer?: ReturnType<typeof setTimeout>;
  private gesture?: { x: number; y: number; at: number; moved: boolean; held?: boolean };
  private hassSnapshot = '';

  public setConfig(config: WeatherCardConfig): void {
    if (!config.weather_entity?.startsWith('weather.')) throw new Error('Choisis une entité weather pour Niak Weather.');
    const next = cleanConfig(config), old = this.config;
    if (old && JSON.stringify(old) === JSON.stringify(next)) return;
    this.config = next;
    // Cosmetic edits must not clear graphs and launch new forecast/history requests.
    if (!old || old.weather_entity !== next.weather_entity || old.pressure_entity !== next.pressure_entity || old.wind_speed_entity !== next.wind_speed_entity) {
      this.generation++;
      this.hourly = []; this.daily = []; this.history = {}; this.forecastAt = 0; this.historyAt = 0;
      this.forecastPending = false; this.historyPending = false;
    }
    this.requestUpdate();
  }
  public static getStubConfig(hass?: HomeAssistant): WeatherCardConfig {
    const weather = Object.keys(hass?.states ?? {}).find(id => id.startsWith('weather.')) ?? '';
    return { type: 'custom:niak-weather-card', weather_entity: weather };
  }
  public static getConfigElement(): HTMLElement { return document.createElement('niak-weather-card-editor'); }
  public getCardSize(): number {
    if (!this.config) return 10;
    return Math.max(1, (this.config.show_synthesis === false ? 0 : 3)
      + (this.config.show_today === false ? 0 : 4) + (this.config.show_predictions === false ? 0 : 3));
  }
  public getGridOptions() { return { columns: 'full', rows: 'auto' }; }
  public connectedCallback(): void {
    super.connectedCallback();
    this.timer = setInterval(() => { this.requestUpdate(); }, 60_000);
    this.forecastAt = 0; this.historyAt = 0;
  }
  public disconnectedCallback(): void {
    super.disconnectedCallback(); clearInterval(this.timer); clearTimeout(this.holdTimer); this.generation++;
    this.forecastPending = false; this.historyPending = false;
  }
  protected updated(): void { if (this.isConnected) { void this.loadForecasts(); void this.loadHistory(); } }
  protected shouldUpdate(changed: Map<PropertyKey, unknown>): boolean {
    if (!this.hass || !this.config) return true;
    const ids = Object.values(this.config).filter((v): v is string => typeof v === 'string' && /^(sensor|weather|sun|binary_sensor)\./.test(v));
    ids.push(this.config.sun_entity || 'sun.sun', ...(this.config.pollens ?? []).map(p=>p.id));
    const snapshot = JSON.stringify([this.hass.language,this.hass.config?.time_zone,...ids.map(id=>this.hass!.states[id])]);
    const different = snapshot !== this.hassSnapshot; this.hassSnapshot = snapshot;
    return changed.size !== 1 || !changed.has('hass') || different;
  }

  private async loadForecasts(): Promise<void> {
    if (!this.hass || !this.config || this.forecastPending || Date.now() - this.forecastAt < 900_000) return;
    this.forecastPending = true; this.forecastAt = Date.now();
    const generation = this.generation, id = this.config.weather_entity, hass = this.hass;
    const request = (type: 'hourly' | 'daily') => hass.callWS<ForecastResponse>({ type: 'call_service', domain: 'weather', service: 'get_forecasts',
      service_data: { type }, target: { entity_id: id }, return_response: true });
    const results = await Promise.allSettled([request('hourly'), request('daily')]);
    if (generation !== this.generation || !this.isConnected) return;
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
    const ids = [this.config.pressure_entity, this.config.wind_speed_entity].filter((id): id is string => !!id);
    if (!ids.length) return;
    this.historyPending = true; this.historyAt = Date.now();
    const generation = this.generation;
    try {
      const result = await this.hass.callWS<History>({ type: 'history/history_during_period', start_time: new Date(Date.now() - 10800_000).toISOString(),
        end_time: new Date().toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
      if (generation === this.generation && this.isConnected) this.history = result;
    } catch { /* Recorder may exclude the entities. No invented trend: the local renderer says it's being measured. */ }
    finally { if (generation === this.generation) this.historyPending = false; }
  }
  protected render() {
    if (!this.hass || !this.config) return nothing;
    const config = this.config, hass = this.hass, now = new Date();
    const forecast = normaliseForecasts(this.hourly, this.daily, now, hass.config?.time_zone);
    const hourly = forecast.heures.map((p: any) => ({ datetime: '', temperature: finite(p.t), precipitation: finite(p.p), condition: p.c }));
    const calculated = buildLocalModel(hass, config, hourly, this.history, now);
    let model = calculated;
    const weather = hass.states[config.weather_entity];
    const briefPoints: BriefPoint[] = this.hourly.map(p => ({ hours: (Date.parse(p.datetime) - now.getTime()) / 3600_000, temperature: p.temperature, precipitation: p.precipitation, condition: p.condition }));
    const brief = config.smart_brief === false || config.show_synthesis === false ? undefined : buildWeatherBrief(hass, config, model, briefPoints, now);
    if (['unknown', 'unavailable'].includes(model.state)) model = { ...model, attributes:{} };
    const variables = { mode: 'complet', dashboard:true, adaptive:true, configured:config, ent: '__niak_model', ent_prev: '__niak_forecast',
      lieu: config.location ?? String(weather?.attributes.friendly_name ?? ''),
      source_prev: config.forecast_source ?? (/france/i.test(String(weather?.attributes.attribution)) ? 'Météo-France' : 'prévisions'),
      jauge_min: -5, jauge_max: 45, jours_max: 7, brief, pollens: usesAtmoPollens(config) || config.pollen_source === 'none' ? [] : config.pollens ?? [] };
    const states = { ...hass.states, __niak_model: model, __niak_forecast: { state: String(forecast.heures.length), attributes: forecast } };
    const rendered = renderLocal(variables, states, hass);
    return html`<ha-card><div id="container" ?data-smart-brief=${!!brief} @pointerdown=${this.down} @pointermove=${this.move} @pointercancel=${this.cancel} @pointerup=${this.up}
      @click=${this.handleClick} @keydown=${this.keydown}>${renderDashboard(rendered, brief, model, hass, config, now, variables.lieu, this.hourly)}</div></ha-card>`;
  }
  private down(event: PointerEvent): void {
    clearTimeout(this.holdTimer); if (event.button !== 0) return;
    if (event.composedPath().some(e => e instanceof HTMLElement && e.classList.contains('nw-comfort-info'))) return;
    if (event.composedPath().some(e => e instanceof HTMLElement && e.tagName === 'SUMMARY')) return;
    this.gesture = { x:event.clientX, y:event.clientY, at:Date.now(), moved:false };
    if (this.config?.weather_path) this.holdTimer = setTimeout(() => {
      if (this.gesture && !this.gesture.moved) { this.gesture.held = true; this.navigate(this.config!.weather_path!); }
    }, 500);
  }
  private move(event: PointerEvent): void {
    if (this.gesture && Math.hypot(event.clientX - this.gesture.x, event.clientY - this.gesture.y) > 12) {
      this.gesture.moved = true; clearTimeout(this.holdTimer);
    }
  }
  private up(): void { clearTimeout(this.holdTimer); }
  private cancel(): void { clearTimeout(this.holdTimer); if (this.gesture) this.gesture.moved = true; }
  private open(entityId: string): void {
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
  }
  private handleClick(event: MouseEvent): void {
    event.stopPropagation(); const gesture = this.gesture; this.gesture = undefined;
    if (event.composedPath().some(e => e instanceof HTMLElement && e.classList.contains('nw-comfort-info'))) return;
    if (event.composedPath().some(e => e instanceof HTMLElement && e.tagName === 'SUMMARY')) return;
    if (gesture?.moved || gesture?.held) return;
    const path = this.config?.weather_path;
    if (gesture && Date.now() - gesture.at >= 500) { if (path) this.navigate(path); return; }
    const target = event.composedPath().find(e => e instanceof HTMLElement && (e.hasAttribute('data-entity') || e.hasAttribute('data-nav'))) as HTMLElement | undefined;
    if (target?.hasAttribute('data-nav')) { this.navigate(target.getAttribute('data-nav')!); return; }
    const id = target?.getAttribute('data-entity') ?? this.config?.weather_entity;
    if (id) this.open(id);
  }
  private keydown(event: KeyboardEvent): void {
    if (!['Enter', ' '].includes(event.key)) return;
    const target = event.target instanceof HTMLElement ? event.target.closest('[data-entity], [data-nav]') : null;
    if (target) { event.preventDefault(); event.stopPropagation();
      if (target.hasAttribute('data-nav')) this.navigate(target.getAttribute('data-nav')!); else this.open(target.getAttribute('data-entity')!);
    }
  }
  private navigate(path: string): void {
    if (!path.startsWith('/') || path.startsWith('//')) return;
    history.pushState(null, '', path); window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
  }
  static styles = [css`:host { display:block; } ha-card { padding:0; overflow:hidden; container-type:inline-size; }
    #container { display:block; min-width:0; }
    [data-entity]:focus-visible, [data-nav]:focus-visible { outline:2px solid var(--primary-color); outline-offset:3px; }`, unsafeCSS(localStyles), atmoStyles, css`
    .nw-brief-details p { line-height:1.6; margin:8px 0; overflow-wrap:anywhere; }
    .nw-brief-details button { font:inherit; color:var(--primary-text-color); background:transparent; border:1px solid var(--divider-color,#999); border-radius:6px; padding:4px 8px; cursor:pointer; }
    .nw-brief-caveat { border-left:3px solid #be8c23; padding-left:8px; }
    @media (prefers-reduced-motion:reduce) { #container[data-smart-brief] .me-rond, #container[data-smart-brief] .me-cur i { animation:none; } }
    `, dashboardStyles];
}
window.customCards = window.customCards || [];
window.customCards.push({ type: 'niak-weather-card', name: 'Niak Weather', description: 'Météo locale Ecowitt et prévisions', preview: true,
  getEntitySuggestion: (hass: HomeAssistant, entityId: string) => entityId.startsWith('weather.') ? {
    config: { type: 'custom:niak-weather-card', weather_entity: entityId, ...detectEcowittStation(hass) } } : null });
declare global { interface Window { customCards: Array<Record<string, unknown>>; } }

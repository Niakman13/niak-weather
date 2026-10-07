import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { forecastsFromResponse } from './forecast';
import { buildWeatherBrief, type BriefPoint } from './weather-brief';
import { buildLocalModel, finite, measurement, normaliseForecasts, type History } from './local-model';
import { renderLocal } from './local-renderer';
import { localStyles } from './local-styles';
import { detectEcowittStation } from './station-detection';
import { cleanConfig } from './config';
import {deriveStation,periodStarts,type StationArchive,type Statistic} from './station-history';
import './niak-weather-card-editor';
import { atmoStyles, usesAtmoPollens } from './atmo-view';
import { dashboardStyles, renderDashboard } from './dashboard-view';
import { recentDetailsStyles } from './recent-details';
import { forecastChartStyles } from './forecast-chart';
import type { ForecastResponse, HassEntity, HomeAssistant, WeatherCardConfig, WeatherForecast } from './types';

@customElement('niak-weather-card')
export class NiakWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: WeatherCardConfig;
  @state() private hourly: WeatherForecast[] = [];
  @state() private daily: WeatherForecast[] = [];
  @state() private history: History = {};
  @state() private rainHistory: History = {};
  @state() private stationArchive:StationArchive={rain:[],counter:{}};
  private archiveAt=0;
  private archivePending=false;
  private archiveGeneration=0;
  private forecastGeneration = 0;
  private historyGeneration = 0;
  private rainGeneration = 0;
  private forecastAt = 0;
  private historyAt = 0;
  private rainHistoryAt = 0;
  private rainHistoryPending = false;
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
    if (old?.show_today===false && next.show_today!==false) { this.historyAt=0; this.rainHistoryAt=0; }
    // Cosmetic edits must not clear graphs and launch new forecast/history requests.
    if (!old || old.weather_entity !== next.weather_entity) {
      this.forecastGeneration++;this.hourly=[];this.daily=[];this.forecastAt=0;this.forecastPending=false;
    }
    if (!old || old.pressure_entity !== next.pressure_entity || old.wind_speed_entity !== next.wind_speed_entity || old.wind_gust_entity !== next.wind_gust_entity||old.temperature_entity!==next.temperature_entity||old.station_history!==next.station_history||old.max_daily_gust_entity!==next.max_daily_gust_entity) {
      const retained = new Set([next.pressure_entity,next.wind_speed_entity,next.wind_gust_entity,next.temperature_entity]);
      this.historyGeneration++;this.history=Object.fromEntries(Object.entries(this.history).filter(([id])=>retained.has(id)));this.historyAt=0;this.historyPending=false;
    }
    if (!old || old.daily_rain_entity !== next.daily_rain_entity||old.rain_total_entity!==next.rain_total_entity||old.station_history!==next.station_history) {
      this.rainGeneration++;this.rainHistory={};this.rainHistoryAt=0;this.rainHistoryPending=false;
      this.archiveGeneration++;this.stationArchive={rain:[],counter:{}};this.archiveAt=0;this.archivePending=false;
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
    this.forecastAt = 0; this.historyAt = 0; this.rainHistoryAt = 0;this.archiveAt=0;
  }
  public disconnectedCallback(): void {
    super.disconnectedCallback(); clearInterval(this.timer); clearTimeout(this.holdTimer); this.forecastGeneration++;this.historyGeneration++;this.rainGeneration++;
    this.forecastPending = false; this.historyPending = false;
    this.rainHistoryPending = false;
    this.archiveGeneration++;this.archivePending=false;
  }
  protected updated(): void { if (this.isConnected) { void this.loadForecasts(); void this.loadHistory(); void this.loadRainHistory();void this.loadStationArchive(); } }
  protected shouldUpdate(changed: Map<PropertyKey, unknown>): boolean {
    if (!this.hass || !this.config) return true;
    const ids = Object.values(this.config).filter((v): v is string => typeof v === 'string' && /^(sensor|weather|sun|binary_sensor)\./.test(v));
    ids.push(this.config.sun_entity || 'sun.sun', ...(this.config.season_entity ? [this.config.season_entity] : []), ...(this.config.pollens ?? []).map(p=>p.id));
    const snapshot = JSON.stringify([this.hass.language,this.hass.config?.time_zone,...ids.map(id=>this.hass!.states[id])]);
    const different = snapshot !== this.hassSnapshot; this.hassSnapshot = snapshot;
    return changed.size !== 1 || !changed.has('hass') || different;
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
    const derived=this.config.station_history!==false;
    const ids = [...new Set([this.config.pressure_entity, this.config.wind_speed_entity, this.config.show_today===false?undefined:this.config.wind_gust_entity,derived&&!this.config.temperature_trend_entity?this.config.temperature_entity:undefined].filter((id): id is string => !!id))];
    if (!ids.length) return;
    this.historyPending = true; this.historyAt = Date.now();
    const generation = this.historyGeneration;
    try {
      const today=periodStarts(new Date(),this.hass.config?.time_zone??'UTC').day;
      const start=derived&&!this.config.max_daily_gust_entity&&this.config.wind_gust_entity?Math.min(today,Date.now()-21600_000):Date.now()-21600_000;
      const result = await this.hass.callWS<History>({ type: 'history/history_during_period', start_time: new Date(start).toISOString(),
        end_time: new Date().toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
      if (generation === this.historyGeneration && this.isConnected) this.history = result;
    } catch { /* Recorder may exclude the entities. No invented trend: the local renderer says it's being measured. */ }
    finally { if (generation === this.historyGeneration) this.historyPending = false; }
  }
  private async loadRainHistory(): Promise<void> {
    if (!this.hass || !this.config || this.config.show_today===false || this.rainHistoryPending || Date.now()-this.rainHistoryAt<900_000) return;
    const ids=[this.config.daily_rain_entity,this.config.station_history!==false?this.config.rain_total_entity:undefined].filter((id):id is string=>!!id);
    if(!ids.length)return;
    this.rainHistoryPending=true;this.rainHistoryAt=Date.now();
    const generation=this.rainGeneration;
    try {
      const result=await this.hass.callWS<History>({type:'history/history_during_period',start_time:new Date(Date.now()-8*86400_000).toISOString(),end_time:new Date().toISOString(),entity_ids:ids,minimal_response:true,no_attributes:true});
      if(generation===this.rainGeneration&&this.isConnected)this.rainHistory=result;
    } catch { /* Optional Recorder history: never invent missing daily totals. */ }
    finally {if(generation===this.rainGeneration)this.rainHistoryPending=false;}
  }
  private async loadStationArchive():Promise<void>{
    const hass=this.hass,config=this.config,id=config?.rain_total_entity;
    if(!hass||!config||!id||config.station_history===false||config.show_today===false||this.archivePending||Date.now()-this.archiveAt<900_000)return;
    const e=hass.states[id];
    if(e?.attributes.state_class!=='total_increasing')return;
    this.archivePending=true;this.archiveAt=Date.now();const generation=this.archiveGeneration;
    try{
      const metadata=await hass.callWS<Array<{statistic_id:string;has_sum:boolean;statistics_unit_of_measurement?:string|null;display_unit_of_measurement?:string|null}>>({type:'recorder/get_statistics_metadata',statistic_ids:[id]});
      const meta=Array.isArray(metadata)?metadata.find(m=>m.statistic_id===id&&m.has_sum):undefined;
      // Without `units`, HA returns values converted to the display unit (the entity's current unit when convertible).
      const unit=meta?.display_unit_of_measurement??meta?.statistics_unit_of_measurement;
      if(!meta||!unit||!['mm','in','inch'].includes(unit))return;
      const now=new Date(),timeZone=hass.config?.time_zone??'UTC',year=periodStarts(now,timeZone).year;
      // Hourly rows start on a local midnight, where a daily row ends: no false gap at the junction.
      const hourly=periodStarts(new Date(now.getTime()-9*86400_000),timeZone).day;
      const common={type:'recorder/statistics_during_period',end_time:now.toISOString(),statistic_ids:[id],types:['sum','state']};
      const results=await Promise.allSettled([
        hass.callWS<Record<string,Statistic[]>>({...common,start_time:new Date(Math.min(year,now.getTime()-8*86400_000)-86400_000).toISOString(),period:'day'}),
        hass.callWS<Record<string,Statistic[]>>({...common,start_time:new Date(hourly).toISOString(),period:'hour'})]);
      if(generation!==this.archiveGeneration||!this.isConnected)return;
      const rows=results.flatMap(r=>r.status==='fulfilled'&&Array.isArray(r.value[id])?r.value[id]:[]);
      const ordered=[...new Map(rows.sort((a,b)=>(b.end-b.start)-(a.end-a.start)).map(r=>[r.end,r])).values()].sort((a,b)=>a.end-b.end);
      this.stationArchive={rain:ordered,rainUnit:unit,counter:{}};
    }catch{/* Unsupported statistics/Recorder exclusion: keep missing data honest. */}
    finally{if(generation===this.archiveGeneration)this.archivePending=false;}
  }
  protected render() {
    if (!this.hass || !this.config) return nothing;
    const config = this.config, hass = this.hass, now = new Date();
    const forecast = normaliseForecasts(this.hourly, this.daily, now, hass.config?.time_zone);
    const hourly = forecast.heures.map((p: any) => ({ datetime: '', temperature: finite(p.t), precipitation: finite(p.p), condition: p.c }));
    const derived=config.station_history===false?undefined:deriveStation(hass,config,{...this.stationArchive,counter:this.rainHistory},this.history,now);
    const calculated = buildLocalModel(hass, config, hourly, this.history, now);
    if(derived?.temperatureTrend!==undefined&&config.temperature_trend_entity===undefined){calculated.attributes.tend_temp=derived.temperatureTrend;(calculated.attributes.sources as Record<string,string>).tend_temp=config.temperature_entity!;}
    let model = calculated;
    const weather = hass.states[config.weather_entity];
    const briefPoints: BriefPoint[] = this.hourly.map(p => ({ hours: (Date.parse(p.datetime) - now.getTime()) / 3600_000, temperature: p.temperature, precipitation: p.precipitation, condition: p.condition }));
    const brief = config.smart_brief === false || config.show_synthesis === false ? undefined : buildWeatherBrief(hass, config, model, briefPoints, now,this.daily);
    if (['unknown', 'unavailable'].includes(model.state)) model = { ...model, attributes:{} };
    const variables = { mode: 'complet', dashboard:true, adaptive:true, configured:config, ent: '__niak_model', ent_prev: '__niak_forecast',
      lieu: config.location ?? String(weather?.attributes.friendly_name ?? ''),
      source_prev: config.forecast_source ?? (/france/i.test(String(weather?.attributes.attribution)) ? 'Météo-France' : 'prévisions'),
      jauge_min: -5, jauge_max: 45, jours_max: 7, brief, pollens: usesAtmoPollens(config) || config.pollen_source === 'none' ? [] : config.pollens ?? [] };
    const states = { ...hass.states, __niak_model: model, __niak_forecast: { state: String(forecast.heures.length), attributes: forecast } };
    const rendered = renderLocal(variables, states, hass);
    return html`<ha-card><div id="container" ?data-smart-brief=${!!brief} @pointerdown=${this.down} @pointermove=${this.move} @pointercancel=${this.cancel} @pointerup=${this.up}
      @click=${this.handleClick} @keydown=${this.keydown}>${renderDashboard(rendered, brief, model, hass, config, now, variables.lieu, this.hourly, this.history, this.rainHistory,derived)}</div></ha-card>`;
  }
  private down(event: PointerEvent): void {
    clearTimeout(this.holdTimer); if (event.button !== 0) return;
    if (event.composedPath().some(e => e instanceof HTMLElement && e.classList.contains('nw-comfort-info'))) return;
    if (event.composedPath().some(e => e instanceof HTMLElement && e.classList.contains('nw-brief-details'))) { this.gesture=undefined;return; }
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
    if (!target && event.composedPath().some(e => e instanceof HTMLElement && e.classList.contains('nw-brief-details'))) return;
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
    `, dashboardStyles, recentDetailsStyles, forecastChartStyles];
}
window.customCards = window.customCards || [];
window.customCards.push({ type: 'niak-weather-card', name: 'Niak Weather', description: 'Météo locale Ecowitt et prévisions', preview: true,
  getEntitySuggestion: (hass: HomeAssistant, entityId: string) => entityId.startsWith('weather.') ? {
    config: { type: 'custom:niak-weather-card', weather_entity: entityId, ...detectEcowittStation(hass) } } : null });
declare global { interface Window { customCards: Array<Record<string, unknown>>; } }

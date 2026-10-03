import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { displayState, weatherIcon } from "./format";
import { forecastsFromResponse, toFiniteNumber } from "./forecast";
import { localize } from "./localize";
import { detectEcowittStation } from "./station-detection";
import type { ForecastResponse, HomeAssistant, WeatherCardConfig, WeatherForecast } from "./types";
import "./niak-weather-card-editor";

@customElement("niak-weather-card")
export class NiakWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  private config?: WeatherCardConfig;
  private hourly: WeatherForecast[] = [];
  private daily: WeatherForecast[] = [];
  private forecastFor?: string;

  public setConfig(config: WeatherCardConfig): void {
    if (!config.weather_entity) throw new Error("weather_entity is required");
    this.config = config;
    void this.loadForecasts();
  }

  public static getStubConfig(): WeatherCardConfig {
    return { type: "custom:niak-weather-card", weather_entity: "weather.home", mode: "detailed" };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("niak-weather-card-editor");
  }

  public getCardSize(): number { return 4; }

  protected updated(): void {
    void this.loadForecasts();
  }

  private async loadForecasts(): Promise<void> {
    if (!this.hass || !this.config || this.forecastFor === this.config.weather_entity) return;
    this.forecastFor = this.config.weather_entity;
    try {
      const request = (type: "hourly" | "daily") => this.hass!.callWS<ForecastResponse>({
        type: "call_service", domain: "weather", service: "get_forecasts",
        service_data: { type }, target: { entity_id: this.config!.weather_entity }, return_response: true,
      });
      const [hourly, daily] = await Promise.all([request("hourly"), request("daily")]);
      this.hourly = forecastsFromResponse(hourly, this.config.weather_entity);
      this.daily = forecastsFromResponse(daily, this.config.weather_entity);
    } catch {
      // Forecast support depends on the chosen weather integration. Current conditions stay usable.
      this.hourly = [];
      this.daily = [];
    }
  }

  private timeLabel(value: string): string {
    return new Intl.DateTimeFormat(this.hass?.language || "en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  private dayLabel(value: string): string {
    return new Intl.DateTimeFormat(this.hass?.language || "en", { weekday: "short" }).format(new Date(value));
  }

  protected render() {
    if (!this.hass || !this.config) return nothing;
    const t = (key: Parameters<typeof localize>[1]) => localize(this.hass?.language, key);
    const weather = this.hass.states[this.config.weather_entity];
    const metrics = [
      [t("temperature"), this.config.temperature_entity],
      [t("humidity"), this.config.humidity_entity],
      [t("wind"), this.config.wind_speed_entity],
      [t("rain"), this.config.rain_rate_entity],
    ].filter(([, entityId]) => entityId) as [string, string][];
    const temperature = toFiniteNumber(weather?.attributes.temperature);
    const detailed = this.config.mode !== "compact";

    return html`
      <ha-card>
        <header>${this.config.name || t("cardName")}</header>
        <main>
          <div class="condition"><span>${weatherIcon(weather?.state)}</span><strong>${weather?.state ?? t("unavailable")}</strong></div>
          ${temperature !== undefined ? html`<div class="current">${temperature}°</div>` : nothing}
          ${metrics.length ? html`<div class="metrics">${metrics.map(([label, id]) => html`<div><span>${label}</span><b>${displayState(this.hass?.states[id], t("unavailable"))}</b></div>`)}</div>` : nothing}
          ${detailed && this.hourly.length ? html`<section><h2>${t("nextHours")}</h2><div class="forecast strip">${this.hourly.slice(0, 6).map((item) => html`<div><span>${this.timeLabel(item.datetime)}</span><i>${weatherIcon(item.condition)}</i><b>${toFiniteNumber(item.temperature) ?? "–"}°</b>${item.precipitation ? html`<small>${item.precipitation} mm</small>` : nothing}</div>`)}</div></section>` : nothing}
          ${detailed && this.daily.length ? html`<section><h2>${t("nextDays")}</h2><div class="forecast days">${this.daily.slice(0, 5).map((item) => html`<div><span>${this.dayLabel(item.datetime)}</span><i>${weatherIcon(item.condition)}</i><b>${toFiniteNumber(item.temperature) ?? "–"}°</b>${item.templow !== undefined ? html`<small>${item.templow}°</small>` : nothing}</div>`)}</div></section>` : nothing}
        </main>
      </ha-card>`;
  }

  static styles = css`
    ha-card { overflow: hidden; } header { padding: 16px 16px 0; color: var(--secondary-text-color); font-size: .9rem; font-weight: 600; text-transform: uppercase; } main { padding: 12px 16px 16px; } .condition { display:flex; align-items:center; gap:10px; font-size:1.1rem; text-transform:capitalize; } .condition span { font-size:2.5rem; } .current { margin:8px 0 14px; font-size:3.75rem; font-weight:300; line-height:1; } .metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .metrics div { display:flex; flex-direction:column; gap:2px; padding:10px; border-radius:10px; background:var(--secondary-background-color); } .metrics span, small { color:var(--secondary-text-color); font-size:.75rem; } .metrics b { font-size:.95rem; } section { margin-top:18px; } h2 { margin:0 0 8px; color:var(--secondary-text-color); font-size:.75rem; font-weight:600; letter-spacing:.04em; text-transform:uppercase; } .forecast { display:grid; gap:6px; } .strip { grid-template-columns:repeat(6, minmax(0, 1fr)); } .days { grid-template-columns:repeat(5, minmax(0, 1fr)); } .forecast div { display:flex; min-width:0; flex-direction:column; align-items:center; gap:4px; padding:8px 2px; border-radius:9px; background:var(--secondary-background-color); } .forecast span { overflow:hidden; max-width:100%; color:var(--secondary-text-color); font-size:.7rem; text-overflow:ellipsis; text-transform:capitalize; white-space:nowrap; } .forecast i { font-size:1.25rem; font-style:normal; } .forecast b { font-size:.9rem; }
  `;
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "niak-weather-card", name: "Niak Weather", description: "A configurable weather summary card", preview: true,
  getEntitySuggestion: (hass: HomeAssistant, entityId: string) => {
    if (!entityId.startsWith("weather.")) return null;
    return { config: { type: "custom:niak-weather-card", weather_entity: entityId, mode: "detailed", ...detectEcowittStation(hass) } };
  },
});

declare global { interface Window { customCards: Array<Record<string, unknown>>; } }

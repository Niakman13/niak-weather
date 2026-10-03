import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { displayState, weatherIcon } from "./format";
import { localize } from "./localize";
import type { HomeAssistant, WeatherCardConfig } from "./types";

@customElement("niak-weather-card")
export class NiakWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  private config?: WeatherCardConfig;

  public setConfig(config: WeatherCardConfig): void {
    if (!config.weather_entity) throw new Error("weather_entity is required");
    this.config = config;
  }

  public static getStubConfig(): WeatherCardConfig {
    return { type: "custom:niak-weather-card", weather_entity: "weather.home" };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: "weather_entity", required: true, selector: { entity: { domain: "weather" } } },
        { name: "name", selector: { text: {} } },
        { name: "temperature_entity", selector: { entity: { domain: "sensor" } } },
        { name: "humidity_entity", selector: { entity: { domain: "sensor" } } },
        { name: "wind_speed_entity", selector: { entity: { domain: "sensor" } } },
        { name: "rain_rate_entity", selector: { entity: { domain: "sensor" } } },
      ],
      computeLabel: (schema: { name: string }) => schema.name,
    };
  }

  public getCardSize(): number { return 4; }

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

    return html`
      <ha-card>
        <header>${this.config.name || t("cardName")}</header>
        <main>
          <div class="condition"><span>${weatherIcon(weather?.state)}</span><strong>${weather?.state ?? t("unavailable")}</strong></div>
          ${weather?.attributes.temperature !== undefined ? html`<div class="current">${weather.attributes.temperature}°</div>` : nothing}
          ${metrics.length ? html`<div class="metrics">${metrics.map(([label, id]) => html`<div><span>${label}</span><b>${displayState(this.hass?.states[id], t("unavailable"))}</b></div>`)}</div>` : nothing}
        </main>
      </ha-card>`;
  }

  static styles = css`
    ha-card { overflow: hidden; } header { padding: 16px 16px 0; color: var(--secondary-text-color); font-size: .9rem; font-weight: 600; text-transform: uppercase; } main { padding: 12px 16px 16px; } .condition { display:flex; align-items:center; gap:10px; font-size:1.1rem; text-transform:capitalize; } .condition span { font-size:2.5rem; } .current { margin:8px 0 14px; font-size:3.75rem; font-weight:300; line-height:1; } .metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .metrics div { display:flex; flex-direction:column; gap:2px; padding:10px; border-radius:10px; background:var(--secondary-background-color); } .metrics span { color:var(--secondary-text-color); font-size:.75rem; } .metrics b { font-size:.95rem; }
  `;
}

window.customCards = window.customCards || [];
window.customCards.push({ type: "niak-weather-card", name: "Niak Weather", description: "A configurable weather summary card", preview: true });

declare global { interface Window { customCards: Array<Record<string, unknown>>; } }

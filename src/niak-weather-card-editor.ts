import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { detectEcowittStation } from "./station-detection";
import { localize } from "./localize";
import type { HomeAssistant, WeatherCardConfig } from "./types";

interface ValueChangedEvent extends Event {
  detail: { value?: Partial<WeatherCardConfig> };
}

@customElement("niak-weather-card-editor")
export class NiakWeatherCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: WeatherCardConfig;
  private detected = false;

  public setConfig(config: WeatherCardConfig): void {
    this.config = config;
  }

  protected updated(): void {
    const hasStationFields = this.config?.temperature_entity || this.config?.humidity_entity || this.config?.wind_speed_entity || this.config?.rain_rate_entity;
    if (!this.detected && this.hass && this.config?.weather_entity && !hasStationFields) {
      this.detected = true;
      this.apply({ ...this.config, ...detectEcowittStation(this.hass) });
    }
  }

  private apply(config: WeatherCardConfig): void {
    this.config = config;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config }, bubbles: true, composed: true,
    }));
  }

  private valueChanged(event: ValueChangedEvent): void {
    event.stopPropagation();
    if (this.config && event.detail.value) this.apply({ ...this.config, ...event.detail.value });
  }

  private detect(): void {
    if (this.hass && this.config) this.apply({ ...this.config, ...detectEcowittStation(this.hass) });
  }

  protected render() {
    if (!this.config) return html``;
    const t = (key: Parameters<typeof localize>[1]) => localize(this.hass?.language, key);
    const entity = (name: keyof WeatherCardConfig, required = false) => ({
      name, required, selector: { entity: name === "weather_entity" ? { domain: "weather" } : { domain: "sensor" } },
    });
    const schema = [
      entity("weather_entity", true),
      { name: "name", selector: { text: {} } },
      { name: "mode", selector: { select: { options: [{ value: "compact", label: t("compact") }, { value: "detailed", label: t("detailed") }] } } },
      { type: "expandable", name: "station", title: t("detectStation"), flatten: true, schema: [
        entity("temperature_entity"), entity("humidity_entity"), entity("humidex_entity"), entity("humidex_perception_entity"), entity("comfort_entity"), entity("wind_speed_entity"), entity("wind_gust_entity"), entity("wind_bearing_entity"),
        entity("rain_rate_entity"), entity("daily_rain_entity"), entity("rain_24h_entity"), entity("weekly_rain_entity"), entity("monthly_rain_entity"), entity("yearly_rain_entity"), entity("event_rain_entity"),
        entity("pressure_entity"), entity("solar_radiation_entity"), entity("dew_point_entity"), entity("uv_index_entity"), entity("illuminance_entity"), entity("lightning_distance_entity"),
      ] },
    ];
    const labels: Partial<Record<keyof WeatherCardConfig, string>> = {
      weather_entity: t("weatherEntity"), name: t("name"), mode: t("mode"),
      temperature_entity: t("temperature"), humidity_entity: t("humidity"), humidex_entity: t("humidex"), humidex_perception_entity: "Thermal Comfort", comfort_entity: t("comfort"),
      wind_speed_entity: t("wind"), wind_gust_entity: t("gusts"), wind_bearing_entity: "Wind direction", rain_rate_entity: t("rain"), daily_rain_entity: t("dailyRain"),
      rain_24h_entity: "Rain 24 h", weekly_rain_entity: "Rain week", monthly_rain_entity: "Rain month", yearly_rain_entity: "Rain year", event_rain_entity: "Rain event",
      pressure_entity: t("pressure"), solar_radiation_entity: t("solar"), dew_point_entity: t("dewPoint"), uv_index_entity: "UV", illuminance_entity: t("light"), lightning_distance_entity: "Lightning distance",
    };
    return html`
      <button type="button" @click=${this.detect}>${t("detectStation")}</button>
      <ha-form .hass=${this.hass} .data=${this.config} .schema=${schema}
        .computeLabel=${(item: { name: keyof WeatherCardConfig }) => labels[item.name] ?? item.name}
        @value-changed=${this.valueChanged}></ha-form>`;
  }

  static styles = css`
    button { margin: 0 0 16px; padding: 9px 14px; border: 0; border-radius: 8px; background: var(--primary-color); color: var(--text-primary-color); font: inherit; font-weight: 500; cursor: pointer; }
  `;
}

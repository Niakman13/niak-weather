import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { displayState, weatherIcon } from "./format";
import { forecastsFromResponse, toFiniteNumber } from "./forecast";
import { localize } from "./localize";
import { detectEcowittStation } from "./station-detection";
import { buildWeatherVerdict } from "./weather-model";
import { buildDailyRanges, buildHourlyChart } from "./forecast-chart";
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

  private conditionLabel(condition: string): string {
    const french: Record<string, string> = {
      sunny: "Grand soleil", "clear-night": "Nuit claire", partlycloudy: "Éclaircies", cloudy: "Ciel couvert",
      fog: "Brouillard", rainy: "Pluvieux", pouring: "Fortes pluies", lightning: "Orageux", "lightning-rainy": "Orages et pluie",
      snowy: "Neige", "snowy-rainy": "Pluie et neige", windy: "Venteux", "windy-variant": "Venteux",
    };
    if (this.hass?.language?.toLowerCase().startsWith("fr")) return french[condition] ?? condition;
    return condition.replaceAll("-", " ");
  }

  protected render() {
    if (!this.hass || !this.config) return nothing;
    const t = (key: Parameters<typeof localize>[1]) => localize(this.hass?.language, key);
    const weather = this.hass.states[this.config.weather_entity];
    const metric = (entityId: string | undefined) => entityId ? toFiniteNumber(this.hass?.states[entityId]?.state) : undefined;
    const comfort = this.config.comfort_entity ? this.hass.states[this.config.comfort_entity] : undefined;
    const openWindows = toFiniteNumber(comfort?.attributes.ouverts_n) ?? toFiniteNumber(comfort?.attributes.open_windows);
    const weatherTemperature = toFiniteNumber(weather?.attributes.temperature);
    const verdict = buildWeatherVerdict({
      temperature: metric(this.config.temperature_entity) ?? weatherTemperature,
      humidity: metric(this.config.humidity_entity), humidex: metric(this.config.humidex_entity), openWindows, windSpeed: metric(this.config.wind_speed_entity), windGust: metric(this.config.wind_gust_entity),
      solarRadiation: metric(this.config.solar_radiation_entity), rainRate: metric(this.config.rain_rate_entity), dewPoint: metric(this.config.dew_point_entity),
      uvIndex: metric(this.config.uv_index_entity), lightningDistance: metric(this.config.lightning_distance_entity),
    }, weather?.state, this.hourly);
    const metrics = [
      [t("temperature"), this.config.temperature_entity],
      [t("humidity"), this.config.humidity_entity],
      [t("wind"), this.config.wind_speed_entity],
      [t("rain"), this.config.rain_rate_entity],
    ].filter(([, entityId]) => entityId) as [string, string][];
    const temperature = metric(this.config.temperature_entity) ?? weatherTemperature;
    const detailed = this.config.mode !== "compact";
    const apparent = verdict.apparentTemperature ?? temperature;
    const condition = verdict.condition;
    const differsFromForecast = verdict.conditionSource === "station";
    const effects = [
      ["💨", t("wind"), verdict.effects.wind], ["☀️", "Sun", verdict.effects.sun],
      ["🌧️", t("rain"), verdict.effects.rain], ["🌙", "Night", verdict.effects.night],
    ].filter(([, , effect]) => Math.abs(effect as number) >= 0.1) as [string, string, number][];
    const measuredTiles = [
      ["💨", t("wind"), this.config.wind_speed_entity, this.config.wind_gust_entity ? `${t("gusts")} ${displayState(this.hass.states[this.config.wind_gust_entity], t("unavailable"))}` : ""],
      ["🌧️", t("rain"), this.config.rain_rate_entity, this.config.daily_rain_entity ? `${t("dailyRain")} ${displayState(this.hass.states[this.config.daily_rain_entity], t("unavailable"))}` : ""],
      ["◌", t("pressure"), this.config.pressure_entity, ""],
    ].filter(([, , entityId]) => entityId) as [string, string, string, string][];
    const chips = [
      ["☀️", "UV", this.config.uv_index_entity], ["◒", t("solar"), this.config.solar_radiation_entity],
      ["💧", t("dewPoint"), this.config.dew_point_entity], ["☷", t("light"), this.config.illuminance_entity],
    ].filter(([, , entityId]) => entityId) as [string, string, string][];
    const hourlyChart = buildHourlyChart(this.hourly);
    const dailyRanges = buildDailyRanges(this.daily);
    const line = hourlyChart.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const chartLabelIndexes = new Set([0, Math.floor((hourlyChart.length - 1) / 3), Math.floor((hourlyChart.length - 1) * 2 / 3), hourlyChart.length - 1]);

    return html`
      <ha-card>
        <main>
          <div class="hero level-${verdict.level}">
            <div class="hero-top">
              <div class="weather-bubble">${weatherIcon(condition)}</div>
              <div class="summary"><span class="eyebrow">${this.config.name || t("cardName")}</span><strong>${this.conditionLabel(condition)}</strong>${differsFromForecast ? html`<em>${t("measuredHere")}</em>` : nothing}</div>
              ${apparent !== undefined ? html`<div class="temperature"><b>${apparent}°</b><span>${t("apparent")}</span>${temperature !== undefined && Math.abs(apparent - temperature) >= .35 ? html`<small>${temperature}° ${t("thermometer")}</small>` : nothing}</div>` : nothing}
            </div>
            ${apparent !== undefined ? html`<div class="gauge"><div><i style="left:${Math.min(99, Math.max(1, (apparent + 5) / 50 * 100))}%"></i>${temperature !== undefined ? html`<b style="left:${Math.min(99, Math.max(1, (temperature + 5) / 50 * 100))}%"></b>` : nothing}</div><span>−5°</span><span>45°</span></div>` : nothing}
          ${effects.length ? html`<div class="effects">${effects.map(([icon, label, effect]) => html`<span><i>${icon}</i>${label} ${effect > 0 ? "+" : "−"}${Math.abs(effect).toFixed(1)}°</span>`)}</div>` : nothing}
          </div>
          ${metrics.length ? html`<div class="metrics">${metrics.map(([label, id]) => html`<div><span>${label}</span><b>${displayState(this.hass?.states[id], t("unavailable"))}</b></div>`)}</div>` : nothing}
          ${detailed && measuredTiles.length ? html`<section><h2>${t("measured")}</h2><div class="tiles">${measuredTiles.map(([icon, label, entityId, detail]) => html`<div><i>${icon}</i><span>${label}</span><b>${displayState(this.hass?.states[entityId], t("unavailable"))}</b>${detail ? html`<small>${detail}</small>` : nothing}</div>`)}</div></section>` : nothing}
          ${detailed && chips.length ? html`<div class="chips">${chips.map(([icon, label, entityId]) => html`<span><i>${icon}</i><b>${displayState(this.hass?.states[entityId], t("unavailable"))}</b>${label}</span>`)}</div>` : nothing}
          ${detailed && hourlyChart.length ? html`<section class="curve-section"><h2>${t("nextHours")} · ${t("forecastSource")}</h2><div class="curve"><svg viewBox="0 0 100 82" preserveAspectRatio="none" aria-label=${t("nextHours")}><defs><linearGradient id="niak-temperature" x1="0" x2="0" y1="0" y2="1"><stop stop-color="var(--primary-color)" stop-opacity=".35"/><stop offset="1" stop-color="var(--primary-color)" stop-opacity="0"/></linearGradient></defs><path d=${`M ${line} L 100 62 L 0 62 Z`} fill="url(#niak-temperature)"/><polyline points=${line} fill="none" stroke="var(--primary-color)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" vector-effect="non-scaling-stroke"/>${hourlyChart.map((point, index) => html`${point.rain ? html`<line x1=${point.x} x2=${point.x} y1=${78 - point.rain} y2="78" class="rain-bar" vector-effect="non-scaling-stroke"/>` : nothing}${chartLabelIndexes.has(index) ? html`<text x=${point.x} y=${Math.max(6, point.y - 4)} text-anchor="middle">${Math.round(toFiniteNumber(point.forecast.temperature) ?? 0)}°</text><text x=${point.x} y="82" text-anchor="middle">${this.timeLabel(point.forecast.datetime).slice(0, 2)}h</text>` : nothing}`)}</svg><div class="curve-icons">${hourlyChart.map((point) => html`<span>${weatherIcon(point.forecast.condition)}</span>`)}</div></div></section>` : nothing}
          ${detailed && dailyRanges.length ? html`<section><h2>${t("nextDays")} · ${t("forecastSource")}</h2><div class="daily-ranges">${dailyRanges.map((day) => html`<div><span>${this.dayLabel(day.forecast.datetime)}</span><i>${weatherIcon(day.forecast.condition)}</i><div class="range"><b style=${`left:${day.start}%;width:${day.width}%`}></b></div><small>${day.low}°</small><strong>${day.high}°</strong>${day.forecast.precipitation ? html`<em>${day.forecast.precipitation} mm</em>` : nothing}</div>`)}</div></section>` : nothing}
        </main>
      </ha-card>`;
  }

  static styles = css`
    ha-card { overflow:hidden; } main { padding:0 16px 16px; } .hero { margin:0 -16px 14px; padding:16px; border-bottom:1px solid color-mix(in srgb, var(--primary-text-color) 8%, transparent); background:radial-gradient(circle at 8% 10%, rgb(var(--weather-accent, 61,155,233) / .18), transparent 35%); } .level-urgent { --weather-accent:244,105,102; } .level-action { --weather-accent:244,180,86; } .level-optimized { --weather-accent:61,155,233; } .hero-top { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:12px; } .weather-bubble { display:grid; width:54px; height:54px; place-items:center; border:1px solid rgb(var(--weather-accent, 61,155,233) / .35); border-radius:50%; background:rgb(var(--weather-accent, 61,155,233) / .13); box-shadow:0 0 22px rgb(var(--weather-accent, 61,155,233) / .20); font-size:28px; } .summary { display:flex; min-width:0; flex-direction:column; gap:3px; } .summary strong { overflow:hidden; font-size:1.05rem; text-overflow:ellipsis; white-space:nowrap; } .eyebrow, .summary em { color:var(--secondary-text-color); font-size:.7rem; font-style:normal; text-transform:uppercase; } .summary em { width:max-content; padding:2px 6px; border-radius:8px; background:rgb(var(--weather-accent, 61,155,233) / .16); color:rgb(var(--weather-accent, 61,155,233)); } .temperature { display:flex; align-items:flex-end; flex-direction:column; } .temperature b { font-size:3rem; font-weight:300; line-height:.9; } .temperature span, .temperature small { margin-top:4px; color:var(--secondary-text-color); font-size:.7rem; } .gauge { margin-top:17px; } .gauge div { position:relative; height:6px; border-radius:4px; background:linear-gradient(90deg,#65a8e6,#66bd9e,#f0c860,#e7836e); } .gauge i, .gauge b { position:absolute; top:50%; width:12px; height:12px; border-radius:50%; transform:translate(-50%,-50%); } .gauge i { border:3px solid var(--card-background-color); background:rgb(var(--weather-accent,61,155,233)); box-shadow:0 0 0 2px rgb(var(--weather-accent,61,155,233)); } .gauge b { width:2px; height:16px; background:var(--primary-text-color); } .gauge > span { display:inline-block; width:50%; margin-top:5px; color:var(--secondary-text-color); font-size:.7rem; } .gauge > span:last-child { text-align:right; } .effects, .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:13px; } .effects span, .chips span { padding:5px 8px; border-radius:12px; background:var(--secondary-background-color); color:var(--secondary-text-color); font-size:.72rem; } .effects i, .chips i { margin-right:3px; font-style:normal; } .chips { margin-top:10px; } .chips b { margin-right:4px; color:var(--primary-text-color); } .metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .metrics div { display:flex; flex-direction:column; gap:2px; padding:10px; border-radius:10px; background:var(--secondary-background-color); } .metrics span, small { color:var(--secondary-text-color); font-size:.75rem; } .metrics b { font-size:.95rem; } section { margin-top:18px; } h2 { margin:0 0 8px; color:var(--secondary-text-color); font-size:.75rem; font-weight:600; letter-spacing:.04em; text-transform:uppercase; } .tiles { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; } .tiles div { display:flex; min-width:0; flex-direction:column; gap:3px; padding:10px; border-radius:11px; background:var(--secondary-background-color); } .tiles i { font-size:1.1rem; font-style:normal; } .tiles span { overflow:hidden; color:var(--secondary-text-color); font-size:.7rem; text-overflow:ellipsis; white-space:nowrap; } .tiles b { overflow:hidden; font-size:.9rem; text-overflow:ellipsis; white-space:nowrap; } .curve { position:relative; min-height:125px; overflow:hidden; border-radius:11px; background:var(--secondary-background-color); } svg { display:block; width:100%; height:105px; overflow:visible; } svg text { fill:var(--secondary-text-color); font-family:var(--paper-font-common-base_-_font-family, sans-serif); font-size:4px; } .rain-bar { stroke:var(--primary-color); stroke-linecap:round; stroke-width:1.5; opacity:.75; } .curve-icons { display:grid; grid-template-columns:repeat(18,minmax(0,1fr)); position:absolute; top:55px; right:0; left:0; padding:0 2px; font-size:.7rem; text-align:center; } .curve-icons span:nth-child(n+19) { display:none; } .daily-ranges { display:grid; gap:7px; } .daily-ranges > div { display:grid; grid-template-columns:38px 24px minmax(50px,1fr) 28px 28px auto; align-items:center; gap:5px; min-height:28px; } .daily-ranges span { overflow:hidden; color:var(--secondary-text-color); font-size:.72rem; text-overflow:ellipsis; text-transform:capitalize; white-space:nowrap; } .daily-ranges i { font-size:1rem; font-style:normal; } .range { position:relative; height:6px; border-radius:4px; background:color-mix(in srgb,var(--primary-text-color) 10%,transparent); } .range b { position:absolute; top:0; height:6px; border-radius:4px; background:linear-gradient(90deg,#74a9df,#e8b45e); } .daily-ranges small { text-align:right; } .daily-ranges strong { font-size:.83rem; } .daily-ranges em { color:var(--secondary-text-color); font-size:.68rem; font-style:normal; white-space:nowrap; }
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

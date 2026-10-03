import type { WeatherForecast } from "./types";

export interface LocalMeasurements {
  temperature?: number;
  humidity?: number;
  humidex?: number;
  windSpeed?: number;
  windGust?: number;
  solarRadiation?: number;
  sunElevation?: number;
  rainRate?: number;
  dewPoint?: number;
  uvIndex?: number;
  lightningDistance?: number;
  cloudCoverage?: number;
  openWindows?: number;
}

export interface WeatherVerdict {
  apparentTemperature?: number;
  effects: { wind: number; sun: number; rain: number; night: number };
  condition: string;
  conditionSource: "station" | "forecast";
  rainLevel: 0 | 1 | 2 | 3 | 4;
  nextRainHours?: number;
  nextRainAmount?: number;
  alert?: "openings" | "thunderstorm" | "downpour" | "gusts" | "heatwave" | "frost" | "heat" | "cold" | "uv";
  level: "optimized" | "benefit" | "action" | "urgent";
}

const number = (value: number | undefined) => Number.isFinite(value) ? value : undefined;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function normaliseCondition(condition: string | undefined): string {
  return (condition ?? "unknown").replace("_", "-");
}

/** The local-weather rules first developed for the original Niak dashboard. */
export function buildWeatherVerdict(
  local: LocalMeasurements,
  forecastCondition: string | undefined,
  hourly: WeatherForecast[] = [],
): WeatherVerdict {
  const temperature = number(local.temperature);
  const humidex = number(local.humidex);
  const base = humidex ?? temperature;
  const wind = number(local.windSpeed);
  const gust = number(local.windGust);
  const solar = number(local.solarRadiation);
  const elevation = number(local.sunElevation);
  const rainRate = number(local.rainRate);
  const humidity = number(local.humidity);
  const dewPoint = number(local.dewPoint);
  const forecast = normaliseCondition(forecastCondition);

  const effectiveWind = wind === undefined ? undefined : Math.max((wind * 0.75 + Math.max(wind, gust ?? wind) * 0.25) - 3, 0);
  let windEffect = 0;
  if (effectiveWind !== undefined && base !== undefined) {
    let coefficient = base > 27 ? -0.15 : -0.25;
    if (temperature !== undefined && temperature > 32) {
      const wetness = clamp(((humidity ?? 50) - 25) / 25, 0, 1);
      const furnace = -0.08 * (1 - wetness) + 0.06 * wetness;
      const transition = clamp((temperature - 32) / 3, 0, 1);
      coefficient = coefficient * (1 - transition) + furnace * transition;
    }
    windEffect = clamp(coefficient * effectiveWind, -6, 1.5);
  }
  const sunEffect = elevation !== undefined && elevation > 5 && solar !== undefined && solar > 50
    ? Math.min(solar / 300, 3.5) : 0;
  const rainEffect = rainRate !== undefined && rainRate >= 0.3
    ? -1.5 * Math.min(rainRate / 2, 1) * (1 + Math.min(effectiveWind ?? 0, 30) / 60) : 0;
  const nightEffect = elevation !== undefined && elevation <= -3 && local.cloudCoverage !== undefined && local.cloudCoverage < 40
    ? -1 * (1 - local.cloudCoverage / 40) : 0;
  const apparentTemperature = base === undefined ? undefined : Math.round((base + windEffect + sunEffect + rainEffect + nightEffect) * 10) / 10;

  const rainLevel: WeatherVerdict["rainLevel"] = rainRate === undefined || rainRate < 0.3 ? 0
    : rainRate < 1 ? 1 : rainRate < 4 ? 2 : rainRate < 12 ? 3 : 4;
  const lightning = local.lightningDistance !== undefined && local.lightningDistance >= 0 && local.lightningDistance <= 20;
  const fog = humidity !== undefined && humidity >= 97 && temperature !== undefined && dewPoint !== undefined
    && temperature - dewPoint <= 0.4 && rainLevel === 0;
  const sunshine = solar !== undefined && solar >= 350;
  let observedCondition = "";
  if (!forecast.startsWith("snow")) {
    if (rainLevel >= 3) observedCondition = lightning ? "lightning-rainy" : "pouring";
    else if (rainLevel >= 1) observedCondition = lightning ? "lightning-rainy" : "rainy";
  }
  if (!observedCondition && lightning) observedCondition = "lightning";
  if (!observedCondition && fog) observedCondition = "fog";
  if (!observedCondition && sunshine && ["cloudy", "fog", "rainy", "pouring", "lightning", "lightning-rainy"].includes(forecast)) observedCondition = "partlycloudy";

  const rainIndex = hourly.findIndex((point) => (number(point.precipitation) ?? 0) >= 0.3);
  const nextRainHours = rainIndex >= 0 ? rainIndex : undefined;
  const nextRainAmount = rainIndex >= 0 ? number(hourly[rainIndex].precipitation) : undefined;
  const forecastStorm = hourly.slice(0, 6).some((point) => ["lightning", "lightning-rainy", "hail"].includes(normaliseCondition(point.condition)));
  const wetSoon = rainLevel > 0 || (nextRainHours !== undefined && nextRainHours <= 2);

  let alert: WeatherVerdict["alert"];
  if (wetSoon && (local.openWindows ?? 0) > 0) alert = "openings";
  else if (lightning || forecastStorm) alert = "thunderstorm";
  else if (rainLevel === 4) alert = "downpour";
  else if ((gust ?? -Infinity) >= 80) alert = "gusts";
  else if ((apparentTemperature ?? -Infinity) >= 38) alert = "heatwave";
  else if ((apparentTemperature ?? Infinity) <= -3) alert = "frost";
  else if ((gust ?? -Infinity) >= 60) alert = "gusts";
  else if ((apparentTemperature ?? -Infinity) >= 34) alert = "heat";
  else if ((apparentTemperature ?? Infinity) <= 2) alert = "cold";
  else if ((local.uvIndex ?? -Infinity) >= 8) alert = "uv";

  const level: WeatherVerdict["level"] = alert === "openings" || alert === "thunderstorm" || alert === "heatwave" || alert === "frost" ? "urgent"
    : alert ? "action" : "optimized";
  return {
    apparentTemperature, effects: { wind: windEffect, sun: sunEffect, rain: rainEffect, night: nightEffect },
    condition: observedCondition || forecast, conditionSource: observedCondition ? "station" : "forecast",
    rainLevel, nextRainHours, nextRainAmount, alert, level,
  };
}

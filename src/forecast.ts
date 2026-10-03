import type { ForecastResponse, WeatherForecast } from "./types";

export function forecastsFromResponse(
  payload: ForecastResponse,
  entityId: string,
): WeatherForecast[] {
  return payload.response?.[entityId]?.forecast ?? [];
}

export function toFiniteNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

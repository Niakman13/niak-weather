import type { ForecastResponse, WeatherForecast } from "./types";

export function forecastsFromResponse(
  payload: ForecastResponse,
  entityId: string,
): WeatherForecast[] {
  const rows = payload?.response?.[entityId]?.forecast;
  return Array.isArray(rows) ? rows.filter(row => row && typeof row.datetime === 'string') : [];
}

export function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

import type { WeatherForecast } from "./types";

export interface HourlyChartPoint {
  forecast: WeatherForecast;
  x: number;
  y: number;
  rain: number;
}

export interface DailyRange {
  forecast: WeatherForecast;
  low: number;
  high: number;
  start: number;
  width: number;
}

const finite = (value: unknown): number | undefined => {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : undefined;
};

/** Coordinates use a 0–100 SVG viewBox, so the graph scales without recalculation. */
export function buildHourlyChart(forecasts: WeatherForecast[], limit = 18): HourlyChartPoint[] {
  const shown = forecasts.slice(0, limit).filter((forecast) => finite(forecast.temperature) !== undefined);
  if (!shown.length) return [];
  const temperatures = shown.map((forecast) => finite(forecast.temperature) as number);
  const minimum = Math.min(...temperatures);
  const maximum = Math.max(...temperatures);
  const span = Math.max(maximum - minimum, 2);
  const maxRain = Math.max(1, ...shown.map((forecast) => finite(forecast.precipitation) ?? 0));
  return shown.map((forecast, index) => {
    const temperature = finite(forecast.temperature) as number;
    return {
      forecast,
      x: shown.length === 1 ? 50 : index / (shown.length - 1) * 100,
      y: 8 + (maximum - temperature) / span * 48,
      rain: Math.min(20, (finite(forecast.precipitation) ?? 0) / maxRain * 20),
    };
  });
}

export function buildDailyRanges(forecasts: WeatherForecast[], limit = 7): DailyRange[] {
  const usable = forecasts.slice(0, limit).map((forecast) => ({
    forecast, high: finite(forecast.temperature), low: finite(forecast.templow),
  })).filter((item): item is { forecast: WeatherForecast; high: number; low: number } => item.high !== undefined && item.low !== undefined);
  if (!usable.length) return [];
  const floor = Math.min(...usable.map((item) => item.low));
  const ceiling = Math.max(...usable.map((item) => item.high));
  const span = Math.max(ceiling - floor, 2);
  return usable.map(({ forecast, low, high }) => ({
    forecast, low, high, start: (low - floor) / span * 100, width: Math.max(3, (high - low) / span * 100),
  }));
}

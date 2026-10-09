import { finite, measurement } from './local-model';
import type { WeatherForecast } from '../types';
import { dateFormat } from '../intl-cache';

export interface ForecastSlot { hour: number; day: number; t?: number; p: number; c: string; night: boolean; w?: number; g?: number; b?: number }

const parts = (date: Date, timeZone?: string) => Object.fromEntries(dateFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));

/** The next 18 hourly points, in local time, with night flagged from today's sunrise and sunset (decimal hours). */
export function forecastSlots(hourly: WeatherForecast[], now: Date, timeZone?: string, sunrise = 6.5, sunset = 21, windUnit = 'km/h'): ForecastSlot[] {
  const today = parts(now, timeZone), serial = (p: Record<string, string>) => Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
  return hourly.map(p => ({ p, time: Date.parse(p.datetime) })).filter(x => Number.isFinite(x.time) && x.time >= now.getTime() - 30 * 60_000)
    .sort((a, b) => a.time - b.time).slice(0, 18).map(({ p, time }) => {
      const local = parts(new Date(time), timeZone), hour = +local.hour;
      return { hour, day: serial(local) - serial(today), t: finite(p.temperature), p: Math.max(0, finite(p.precipitation) ?? 0),
        c: String(p.condition ?? '').replaceAll('_', '-'), night: hour < sunrise || hour >= sunset,
        w: measurement(p.wind_speed, windUnit, 'wind'), g: measurement(p.wind_gust_speed, windUnit, 'wind'), b: finite(p.wind_bearing) };
    });
}


import { briefPresentation, briefSecondarySignals } from './brief-preview';
import type { BriefSignal, WeatherBrief } from './weather-brief';

/** The meaning colours of the charter; a bubble's icon takes the colour of its theme. */
export type Theme = 'rain' | 'wind' | 'heat' | 'cold' | 'calm' | 'pressure' | 'level1';
/** One point of the brief as the bubbles show it: a group label, an icon and one sentence. */
export interface TickerPoint { group: BriefSignal['group']; label: string; icon: string; text: string; level: number; theme?: Theme; entity?: string }
/** An alert bubble: the official vigilance, or what the station measures at home. Both can show at once. */
export interface AlertPoint { level: 1 | 2 | 3; label?: string; text: string; icon: string; source: string; entity?: string; official: boolean }

const label = (s: BriefSignal) => s.group === 'now' ? 'Maintenant' : s.group === 'future' ? 'À venir'
  : s.key.startsWith('pollen') || s.key.startsWith('legacy') ? 'Pollens' : 'Air';

/** Which meaning colour a point carries: rain, wind, heat or cold, pressure, air. */
export function themeOf(s: BriefSignal): Theme | undefined {
  if (s.key.startsWith('rain') || s.key === 'wind-rain') return 'rain';
  if (s.key.startsWith('wind')) return 'wind';
  if (s.key === 'pressure' || s.key === 'storm') return 'pressure';
  if (s.key === 'uv') return 'level1';
  if (['freeze-future', 'frost-night', 'fog', 'fog-later'].includes(s.key)) return 'cold';
  if (['temperature', 'comfort-gap', 'temperature-future'].includes(s.key)) return /low|snow/.test(s.icon) ? 'cold' : 'heat';
  if (s.group === 'environment') return 'calm';
}

/** The points the bubble scrolls through, most important first, without the official warning (it has its own bubble). */
export function tickerPoints(brief?: WeatherBrief): TickerPoint[] {
  if (!brief) return [];
  const preview = briefPresentation(brief);
  const candidates = [...preview.selected, brief.signals.find(s => s.key === preview.contextKey),
    brief.signals.find(s => s.key === preview.outlookKey), ...briefSecondarySignals(brief)];
  const points: TickerPoint[] = [], seen = new Set<BriefSignal>();
  for (const s of candidates) if (s && s.group !== 'official' && !seen.has(s)) {
    seen.add(s); points.push({ group: s.group, label: label(s), icon: s.icon, text: s.text, level: s.severity, theme: themeOf(s), entity: s.entity });
  }
  return points.slice(0, 4);
}

/** The vigilance first, then the most important point needing attention at home: neither hides the other. */
export function alertPoints(brief?: WeatherBrief): AlertPoint[] {
  const alerts: AlertPoint[] = [];
  const official = brief?.signals.find(x => x.key === 'official' && x.severity > 0);
  if (official) {
    const parts = vigilanceParts(official.text);
    alerts.push({ level: official.severity as 1 | 2 | 3, label: parts.level, text: parts.detail, icon: 'mdi:alert-outline', source: official.text, entity: official.entity, official: true });
  }
  const top = brief?.signals.filter(x => x.group !== 'official' && x.severity > 0).sort((a, b) => b.severity - a.severity)[0];
  if (top) alerts.push({ level: top.severity as 1 | 2 | 3, label: label(top), text: top.text, icon: top.icon, source: top.text, entity: top.entity, official: false });
  return alerts;
}

/** "Vigilance jaune · vent violent" → level above ("Vigilance jaune"), phenomena below ("Vent violent"). Other texts stay on one line. */
export function vigilanceParts(text: string): { level?: string; detail: string } {
  const [level, ...rest] = text.split(' · ');
  const detail = rest.join(' · ');
  return /^Vigilance (jaune|orange|rouge)$/.test(level) && detail ? { level, detail: detail[0].toUpperCase() + detail.slice(1) } : { detail: text };
}

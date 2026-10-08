import { briefPresentation, briefSecondarySignals } from './brief-preview';
import type { BriefSignal, WeatherBrief } from './weather-brief';

/** One point of the brief as the small formats show it: a group label, an icon and one sentence. */
export interface TickerPoint { group: BriefSignal['group']; label: string; icon: string; text: string; level: number }
/** The alert bubble: the official vigilance when there is one, otherwise the brief's most important point needing attention. */
export interface AlertPoint { level: 1 | 2 | 3; label?: string; text: string; icon: string; source: string; entity?: string; official: boolean }

const label = (s: BriefSignal) => s.group === 'now' ? 'Maintenant' : s.group === 'future' ? 'À venir'
  : s.key.startsWith('pollen') || s.key.startsWith('legacy') ? 'Pollens' : 'Air';

/** The points the banner would show, most important first, without the official warning (it has its own bubble). */
export function tickerPoints(brief?: WeatherBrief): TickerPoint[] {
  if (!brief) return [];
  const preview = briefPresentation(brief);
  const candidates = [...preview.selected, brief.signals.find(s => s.key === preview.contextKey),
    brief.signals.find(s => s.key === preview.outlookKey), ...briefSecondarySignals(brief)];
  const points: TickerPoint[] = [], seen = new Set<BriefSignal>();
  for (const s of candidates) if (s && s.group !== 'official' && !seen.has(s)) {
    seen.add(s); points.push({ group: s.group, label: label(s), icon: s.icon, text: s.text, level: s.severity });
  }
  return points.slice(0, 4);
}

/** One rule for the three formats: the vigilance always wins the bubble, so it is never hidden by a stronger brief point. */
export function alertPoint(brief?: WeatherBrief): AlertPoint | undefined {
  const official = brief?.signals.find(x => x.key === 'official' && x.severity > 0);
  if (official) {
    const parts = vigilanceParts(official.text);
    return { level: official.severity as 1 | 2 | 3, label: parts.level, text: parts.detail, icon: 'mdi:alert-outline', source: official.text, entity: official.entity, official: true };
  }
  const top = brief?.signals.filter(x => x.group !== 'official' && x.severity > 0).sort((a, b) => b.severity - a.severity)[0];
  return top ? { level: top.severity as 1 | 2 | 3, label: label(top), text: top.text, icon: top.icon, source: top.text, entity: top.entity, official: false } : undefined;
}

/** "Vigilance jaune · vent violent" → level above ("Vigilance jaune"), phenomena below ("Vent violent"). Other texts stay on one line. */
export function vigilanceParts(text: string): { level?: string; detail: string } {
  const [level, ...rest] = text.split(' · ');
  const detail = rest.join(' · ');
  return /^Vigilance (jaune|orange|rouge)$/.test(level) && detail ? { level, detail: detail[0].toUpperCase() + detail.slice(1) } : { detail: text };
}

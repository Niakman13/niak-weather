import { briefPresentation, briefSecondarySignals } from './brief-preview';
import type { BriefSignal, WeatherBrief } from './weather-brief';

/** One point of the brief as the small formats show it: a group label, an icon and one sentence. */
export interface TickerPoint { label: string; icon: string; text: string; level: number }
export interface VigilanceBadge { level: 1 | 2 | 3; label: string; short: string; entity?: string }

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
    seen.add(s); points.push({ label: label(s), icon: s.icon, text: s.text, level: s.severity });
  }
  return points.slice(0, 4);
}

/** Météo-France vigilance from the brief: "Vigilance jaune orages", and "Jaune orages" for the tile. */
export function vigilanceBadge(brief?: WeatherBrief): VigilanceBadge | undefined {
  const s = brief?.signals.find(x => x.key === 'official');
  if (!s || s.severity === 0) return undefined;
  const color = ['', 'jaune', 'orange', 'rouge'][s.severity];
  const phenomena = (s.text.split(' : ')[1] ?? '').split(', ').map(p => p.replace(/\s*\([^)]*\)$/, '').trim().toLowerCase()).filter(Boolean);
  const first = phenomena.length ? ` ${phenomena[0]}${phenomena.length > 1 ? ` +${phenomena.length - 1}` : ''}` : '';
  return { level: s.severity as 1 | 2 | 3, label: `Vigilance ${color}${phenomena.length ? ' ' + phenomena.join(', ') : ''}`,
    short: `${color[0].toUpperCase()}${color.slice(1)}${first}`, entity: s.entity };
}

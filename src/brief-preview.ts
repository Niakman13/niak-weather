import type { WeatherBrief } from './weather-brief';

/** Keep the highest attention signal, then diversify. Never change the engine's risk level. */
export function briefPreview(brief: WeatherBrief) {
  const significant = brief.signals.filter(s => s.severity > 0).sort((a, b) => b.severity - a.severity);
  const selected = significant.slice(0, 1);
  for (const group of ['future', 'now', 'environment', 'official'] as const) {
    const signal = significant.find(s => s.group === group && !selected.includes(s));
    if (signal && selected.length < 3) selected.push(signal);
  }
  for (const signal of significant) if (!selected.includes(signal) && selected.length < 3) selected.push(signal);
  return { selected, remaining: significant.length - selected.length };
}

/** The left panel explains attention/outlook, never repeats the current sky. */
export function briefPresentation(brief: WeatherBrief) {
  const preview=briefPreview(brief),priority=preview.selected[0];
  const outlook=priority?undefined:brief.signals.find(s=>s.group==='future');
  return {
    ...preview,
    headline:priority?.group==='official'?brief.title:priority?.text??outlook?.text??(brief.available?'Pas de point d’attention marqué':'Données insuffisantes pour une synthèse'),
    icon:priority?.icon??outlook?.icon??'mdi:information-outline',
    outlookKey:outlook?.key,
  };
}

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
  const context=priority?undefined:brief.signals.find(s=>s.key==='rain-now')??brief.signals.find(s=>s.key==='comfort-gap')??brief.signals.find(s=>s.key==='pressure');
  const outlook=priority||context?undefined:brief.signals.find(s=>s.group==='future'&&s.key!=='temperature-future')??brief.signals.find(s=>s.key==='temperature-future');
  return {
    ...preview,
    headline:priority?.group==='official'?brief.title:priority?.text??context?.text??outlook?.text,
    icon:priority?.icon??context?.icon??outlook?.icon??'mdi:information-outline',
    contextKey:context?.key,
    outlookKey:outlook?.key,
  };
}

/** Only useful observations/outlooks, without repeating the headline. */
export function briefSecondarySignals(brief: WeatherBrief) {
  const preview=briefPresentation(brief),signals=preview.selected.slice(1);
  for(const signal of [brief.signals.find(s=>s.key==='comfort-gap'),brief.signals.find(s=>s.key==='pressure'),brief.signals.find(s=>s.group==='future'&&s.key!=='temperature-future')]) {
    if(signal && signal!==preview.selected[0] && signal.key!==preview.contextKey && signal.key!==preview.outlookKey && !signals.includes(signal) && signals.length<3) signals.push(signal);
  }
  return signals;
}

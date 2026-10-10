import type { AirPanel, WeatherView } from './view';
import type { WeatherCardConfig } from './types';

/** The view as this card shows it: the integration computes everything, the card's display settings leave out what they hide. */
export function displayed(v: WeatherView, config: WeatherCardConfig, tile: boolean): WeatherView {
  // The tile is the brief: it always shows it. On the full card the synthesis can be switched off, its bubbles with it.
  const brief = tile || (config.smart_brief !== false && config.show_synthesis !== false);
  const details = (panels: AirPanel[]) => config.show_atmo_details === false ? panels.map(p => ({ ...p, details: [] })) : panels;
  return {
    ...v,
    brief: brief ? v.brief : undefined, alerts: brief ? v.alerts : [], points: brief ? v.points : [], timeline: brief ? v.timeline : [],
    bulletin: config.show_bulletin === false ? undefined : v.bulletin,
    air: { today: details(v.air.today), tomorrow: config.show_atmo_tomorrow === false ? [] : details(v.air.tomorrow) },
  };
}

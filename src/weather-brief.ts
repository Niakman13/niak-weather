import { atmoField, atmoFields, atmoMetrics, atmoReading, pollenMetrics, pollutantMetrics, normal } from './atmo';
import { finite } from './local-model';
import type { HassEntity, HomeAssistant, WeatherCardConfig,WeatherForecast } from './types';

export interface BriefPoint { hours: number; temperature?: number; precipitation?: number; condition?: string; }
export interface BriefSignal {
  key: string; group: 'now' | 'future' | 'environment' | 'official'; severity: 0 | 1 | 2 | 3;
  text: string; explanation: string; entity?: string; icon: string;
}
export interface WeatherBrief {
  title: string; label: string; rgb: string; icon: string; summary: string; signals: BriefSignal[]; caveats: string[]; available: boolean;
}
const format = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
const timing = (h: number) => h < 1 ? 'dans l’heure' : `dans environ ${Math.round(h)} h`;
const colors = ['61,155,233', '190,140,35', '230,125,45', '215,70,75'];
const levels = ['Synthèse', 'À surveiller', 'Attention renforcée', 'Vigilance rouge officielle'];
const knownColor = (v: unknown): number | undefined => ({ vert: 0, green: 0, jaune: 1, yellow: 1, orange: 2, rouge: 3, red: 3 })[normal(v).trim() as 'vert'];

/** An attention hierarchy, never a weather model or a health recommendation. */
export function buildWeatherBrief(hass: HomeAssistant, config: WeatherCardConfig, model: HassEntity, points: BriefPoint[], now = new Date(),daily:WeatherForecast[]=[]): WeatherBrief {
  const a = model.attributes, signals: BriefSignal[] = [], caveats: string[] = [];
  const add = (s: BriefSignal) => signals.push(s);
  const source = (key: string) => (a.sources as Record<string, string> | undefined)?.[key];
  const temp = finite(a.t_ext), feels = finite(a.ressenti), wind = finite(a.vent), gust = finite(a.rafales), rain = finite(a.pluie_taux);
  let current = feels === undefined ? 'Ressenti indisponible.' : `${format(feels)} °C ressentis`;
  if (feels !== undefined && temp !== undefined) {
    const thermometer = config.temperature_entity ? 'thermomètre' : 'température météo';
    const delta = feels - temp;
    current += Math.abs(delta) < .6 ? `, proche ${thermometer === 'thermomètre' ? 'du thermomètre' : 'de la température météo'}.` : `, ${format(Math.abs(delta))} °C ${delta > 0 ? 'de plus' : 'de moins'} que ${thermometer === 'thermomètre' ? 'le thermomètre' : 'la température météo'}.`;
    const effects = [['effet_vent', 'le vent'], ['effet_soleil', 'le soleil'], ['effet_pluie', 'la pluie'], ['effet_nuit', 'le ciel nocturne']] as const;
    const effect = effects.map(([key, name]) => ({ value: finite(a[key]) ?? 0, name })).sort((x, y) => Math.abs(y.value) - Math.abs(x.value))[0];
    if (Math.abs(delta) >= .6) current += Math.abs(effect.value) >= .6
      ? ` ${effect.name[0].toUpperCase() + effect.name.slice(1)} ${effect.value > 0 ? 'accentue la chaleur' : 'accentue la fraîcheur'}.`
      : finite(a.humidex) !== undefined && (finite(a.humidex)! - temp) >= .6 ? ' L’humidité accentue la chaleur.' : '';
  }
  if (feels !== undefined && !a.hum_source && finite(a.humidex) === undefined) caveats.push('Humidité indisponible : le ressenti ne compte pas son effet.');
  if (feels !== undefined && (feels >= 34 || feels <= 2)) add({ key: 'temperature', group: 'now', severity: feels >= 38 || feels <= -3 ? 2 : 1,
    text: feels >= 34 ? `Forte chaleur ressentie (${format(feels)} °C)` : `Froid marqué (${format(feels)} °C ressentis)`, explanation: 'Estimation du ressenti de la carte, pas une vigilance canicule/grand froid.', entity: source('t_ext'), icon: feels >= 34 ? 'mdi:thermometer-high' : 'mdi:thermometer-low' });
  if(temp!==undefined&&feels!==undefined&&Math.abs(feels-temp)>4&&!signals.some(s=>s.key==='temperature'))add({key:'comfort-gap',group:'now',severity:0,
    text:`Le ressenti est plus ${feels>temp?'élevé':'bas'} que ${config.temperature_entity?'le thermomètre':'la température météo'} (${feels>temp?'+':'−'}${format(Math.abs(feels-temp))} °C)`,
    explanation:'Écart supérieur à 4 °C entre le ressenti estimé par la carte et la température. Ce n’est pas une température mesurée ni une vigilance officielle.',entity:source('t_ext'),icon:feels>temp?'mdi:thermometer-high':'mdi:thermometer-low'});
  if ((wind ?? 0) >= 30 || (gust ?? 0) >= 40) add({ key: 'wind', group: 'now', severity: (wind ?? 0) >= 50 || (gust ?? 0) >= 60 ? 2 : 1,
    text: `Vent ${Math.max(wind ?? 0, gust ?? 0) >= 60 ? 'très fort' : 'soutenu'}${gust !== undefined ? `, rafales à ${format(gust)} km/h` : ` à ${format(wind!)} km/h`}`,
    explanation: 'Mesures de la station : vent moyen ≥ 30 km/h ou rafales ≥ 40 km/h ; attention renforcée dès 50/60 km/h. Seuils éditoriaux, non officiels.', entity: source(gust !== undefined ? 'rafales' : 'vent'), icon: 'mdi:weather-windy' });
  else if (wind !== undefined && wind >= 0) add({ key: 'wind-soft', group: 'now', severity: 0,
    text: `Vent ${wind < 15 ? 'faible' : 'modéré'} (${format(wind)} km/h)`, explanation: 'Vent moyen actuellement mesuré. L’absence d’alerte ne préjuge pas des rafales futures.', entity: source('vent'), icon: 'mdi:weather-windy' });
  if (rain !== undefined && rain >= .3) add({ key: 'rain-now', group: 'now', severity: rain >= 4 ? 2 : rain >= 1 ? 1 : 0,
    text: `Pluie ${rain >= 4 ? 'forte' : 'en cours'} (${format(rain)} mm/h)`, explanation: 'Intensité instantanée mesurée par la station ; distincte du cumul de pluie prévu.', entity: source('pluie_taux'), icon: 'mdi:weather-pouring' });
  if ((wind ?? 0) >= 30 && (rain ?? 0) >= 1) add({ key: 'wind-rain', group: 'now', severity: 2, text: 'Pluie et vent soutenu se cumulent',
    explanation: 'Pluie mesurée ≥ 1 mm/h et vent moyen ≥ 30 km/h simultanément. Le cumul mérite davantage d’attention ; ce seuil éditorial ne décrit pas une vigilance officielle.', entity: source('pluie_taux'), icon: 'mdi:weather-pouring' });
  if (a.condition === 'fog' && a.cond_source === 'station') add({ key: 'fog', group: 'now', severity: 1, text: 'Conditions compatibles avec du brouillard', explanation: 'Déduction à partir de l’humidité et du point de rosée, pas une mesure directe de visibilité.', entity: source('hr_ext'), icon: 'mdi:weather-fog' });
  if ((finite(a.uv) ?? 0) >= 6) add({ key: 'uv', group: 'now', severity: finite(a.uv)! >= 8 ? 2 : 1, text: `UV élevés (indice ${format(finite(a.uv)!)})`, explanation: 'Indice UV disponible dans les mesures configurées.', entity: source('uv'), icon: 'mdi:weather-sunny-alert' });
  const pressureTrend = a.baro as { s?: string; d?: number; f?: number } | undefined;
  if (pressureTrend && ['hausse', 'baisse'].includes(pressureTrend.s ?? '') && finite(pressureTrend.d) !== undefined) add({ key: 'pressure', group: 'now', severity: 0,
    text: `Pression en ${pressureTrend.s} (${format(Math.abs(pressureTrend.d!))} hPa sur ${format((pressureTrend.f ?? 180) / 60)} h)`,
    explanation: 'Tendance issue de l’historique de la station ; elle ne suffit pas à annoncer une pluie ou une amélioration certaine.', entity: source('pression'), icon: 'mdi:gauge' });
  // Use timestamps/explicit offsets, not array positions; ignore past and invalid points.
  const upcoming = points.filter(p => Number.isFinite(p.hours) && p.hours >= 0 && p.hours <= 6).sort((x, y) => x.hours - y.hours);
  const rains = upcoming.filter(p => finite(p.precipitation) !== undefined && p.precipitation! >= .3);
  if (rains.length) {
    const total = upcoming.reduce((sum, p) => sum + Math.max(0, finite(p.precipitation) ?? 0), 0), peak = Math.max(...rains.map(p => p.precipitation!));
    add({ key: 'rain-future', group: 'future', severity: peak >= 5 || total >= 20 ? 2 : total >= 5 ? 1 : 0,
      text: `${peak >= 5 || total >= 20 ? 'Fortes pluies annoncées' : 'Pluie annoncée'} ${timing(rains[0].hours)} (${upcoming.some(p => finite(p.precipitation) === undefined) ? 'cumul partiel : ' : ''}${format(total)} mm prévus)`,
      explanation: 'Somme des quantités prévues sur les points disponibles des 6 prochaines heures. Attention renforcée dès 5 mm sur un point horaire ou 20 mm cumulés ; ne signifie ni inondation ni vigilance officielle.', entity: config.weather_entity, icon: 'mdi:weather-pouring' });
  }
  const storm = upcoming.find(p => ['lightning', 'lightning-rainy', 'hail'].includes((p.condition ?? '').replaceAll('_', '-')));
  if (storm) add({ key: 'storm', group: 'future', severity: 2, text: `Orage ou grêle annoncé ${timing(storm.hours)}`, explanation: 'Condition annoncée par le fournisseur sur les 6 prochaines heures, pas une détection de foudre.', entity: config.weather_entity, icon: 'mdi:weather-lightning' });
  const cold = upcoming.find(p => finite(p.temperature) !== undefined && p.temperature! <= 0);
  if (cold) add({ key: 'freeze-future', group: 'future', severity: 1, text: `Température prévue à ${format(cold.temperature!)} °C ${timing(cold.hours)}`, explanation: 'Température prévue par le fournisseur ; le gel du sol n’est pas mesuré.', entity: config.weather_entity, icon: 'mdi:snowflake' });
  // Tonight: the forecast minimum of the next 18 h against the frost and dew points measured now.
  const at = (h: number) => `vers ${Number(new Intl.DateTimeFormat('en-GB', { timeZone: hass.config?.time_zone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(now.getTime() + h * 3600_000)))} h`;
  const night = points.filter(p => Number.isFinite(p.hours) && p.hours >= 0 && p.hours <= 18 && finite(p.temperature) !== undefined);
  const low = night.length ? night.reduce((m, p) => p.temperature! < m.temperature! ? p : m) : undefined;
  const frostPoint = finite(a.gelee), dewPoint = finite(a.rosee);
  // The ground cools 2–3 °C below the sheltered thermometer on a calm night: frost can form with +3 °C forecast.
  if (low && low.temperature! <= 3) add({ key: 'frost-night', group: 'future', severity: 1,
    text: low.temperature! <= 0 ? `Gel prévu ${at(low.hours)} (${format(low.temperature!)} °C)`
      : `${frostPoint !== undefined && frostPoint >= low.temperature! - 3 ? 'Gelée blanche possible' : 'Risque de gel au sol'} ${at(low.hours)} (${format(low.temperature!)} °C prévus)`,
    explanation: 'Minimum prévu dans les 18 h. Au sol, une nuit calme fait 2 à 3 °C de moins que sous abri : on prévient dès 3 °C. « Gelée blanche » quand l’air est assez humide pour givrer (point de gelée actuel). À protéger : plantes sensibles, pare-brise.', entity: config.weather_entity, icon: 'mdi:snowflake-alert' });
  // The night's minimum says more than the first freezing hour: keep one frost line.
  if (signals.some(s => s.key === 'frost-night')) signals.splice(signals.findIndex(s => s.key === 'freeze-future'), signals.some(s => s.key === 'freeze-future') ? 1 : 0);
  const calm = (wind ?? 0) < 8, dryAt = (p: BriefPoint) => (finite(p.precipitation) ?? 0) < .3;
  if (low && dewPoint !== undefined && a.condition !== 'fog' && calm && dryAt(low) && low.temperature! <= dewPoint && low.temperature! > 0)
    add({ key: 'fog-later', group: 'future', severity: 0, text: `Brouillard possible ${at(low.hours)}`,
      explanation: 'La température prévue descend jusqu’au point de rosée actuel, avec un vent faible et sans pluie : l’air sature. Indication, pas une prévision de visibilité.', entity: config.weather_entity, icon: 'mdi:weather-fog' });
  const validTemps = upcoming.filter(p => finite(p.temperature) !== undefined);
  if (temp !== undefined && validTemps.length && !cold) {
    const maximum=Math.max(...validTemps.map(p=>p.temperature!)),minimum=Math.min(...validTemps.map(p=>p.temperature!));
    if(maximum-temp>=3||temp-minimum>=3)add({ key: 'temperature-future', group: 'future', severity: 0,
      text: maximum-temp>=3?`Pic de température annoncé : ${format(maximum)} °C`:`Fraîcheur annoncée : minimum de ${format(minimum)} °C`, explanation: 'Maximum ou minimum des points horaires disponibles dans les 6 prochaines heures, comparé à la température actuelle. Ce n’est pas nécessairement le maximum ou minimum de toute la journée.', entity: config.weather_entity, icon: 'mdi:thermometer' });
  }
  const zone=hass.config?.time_zone??'UTC',dateKey=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const today=dateKey(now),tomorrowDate=new Date(`${today}T12:00:00Z`);tomorrowDate.setUTCDate(tomorrowDate.getUTCDate()+1);
  const tomorrow=tomorrowDate.toISOString().slice(0,10);
  const tomorrowRain=daily.find(p=>Number.isFinite(Date.parse(p.datetime))&&dateKey(new Date(p.datetime))===tomorrow&&finite(p.precipitation)!==undefined&&p.precipitation!>=20);
  if(tomorrowRain)add({key:'rain-tomorrow',group:'future',severity:0,text:`Pluie importante prévue demain : ${format(tomorrowRain.precipitation!)} mm`,explanation:'Cumul du bulletin journalier pour demain, à partir de 20 mm. Prévision informative, pas une mesure actuelle, une intensité en mm/h ou une vigilance officielle.',entity:config.weather_entity,icon:'mdi:weather-pouring'});
  if (!upcoming.length) caveats.push('Prévisions des 6 prochaines heures indisponibles.');
  else if (upcoming.some(p => finite(p.precipitation) === undefined)) caveats.push('Quantités de pluie partiellement disponibles : le cumul peut être incomplet.');

  for (const tomorrow of [false, true]) {
    const readGroup = (metrics: typeof pollutantMetrics, pollen: boolean) => metrics.map(metric => ({ metric, reading: atmoReading(hass, config[atmoField(metric, tomorrow)], pollen, false, now) }))
      .filter(x => x.reading && x.reading.value !== undefined);
    const air = readGroup(['air', ...pollutantMetrics], false), pollens = config.pollen_source === 'none' || config.pollen_source === 'legacy' ? [] : readGroup(['pollen', ...pollenMetrics], true);
    for (const [kind, readings] of [['air', air], ['pollen', pollens]] as const) {
      const fresh = readings.filter(x => !x.reading!.stale && x.reading!.value! <= 6).sort((x, y) => y.reading!.value! - x.reading!.value!);
      if (readings.some(x => x.reading!.stale)) caveats.push(`Atmo ${kind === 'air' ? 'air' : 'pollens'} ${tomorrow ? 'demain' : 'aujourd’hui'} : publication ancienne, non utilisée pour qualifier la situation.`);
      if (fresh.some(x => !x.reading!.updated)) caveats.push(`Atmo ${kind === 'air' ? 'air' : 'pollens'} : date de publication non fournie, fraîcheur non vérifiable.`);
      const worst = fresh[0], r = worst?.reading;
      if (r) add({ key: `${kind}-${tomorrow}`, group: 'environment', severity: r.value! >= (kind === 'air' ? 4 : 5) ? 2 : r.value! >= (kind === 'air' ? 3 : 4) ? 1 : 0,
        text: `${kind === 'air' ? 'Air extérieur' : 'Pollens, niveau'} ${r.label.toLowerCase()}${worst.metric !== kind ? ` (${atmoMetrics[worst.metric].label.replace(' — sous-indice', '')})` : ''} ${tomorrow ? 'pour demain' : 'pour aujourd’hui'}`,
        explanation: `Indice Atmo ${r.value}/6 de la zone${r.zone ? ' ' + r.zone : ''}. ${r.updated ? 'Publication : ' + r.updated + '.' : 'Date de publication non fournie.'} Ce n’est pas une mesure instantanée à la maison ; aucun seuil médical n’est calculé.`, entity: r.id, icon: kind === 'air' ? 'mdi:air-filter' : 'mdi:flower-pollen' });
      const event = readings.find(x => x.reading!.value === 7 && !x.reading!.stale);
      if (event) add({ key: `atmo-event-${tomorrow}`, group: 'environment', severity: 1, text: `Évènement Atmo signalé ${tomorrow ? 'pour demain' : 'pour aujourd’hui'}`, explanation: 'Le code 7 est un évènement, pas un niveau supérieur à 6 ni une concentration.', entity: event.reading!.id, icon: 'mdi:information-outline' });
    }
  }
  if (config.pollen_source !== 'none' && config.pollen_source !== 'atmo' && !(config.pollen_source === undefined && atmoFields.some(f => !!config[f]))) {
    for (const p of config.pollens ?? []) {
      const e = hass.states[p.id], level = ({ high: 3, eleve: 3, fort: 3, very_high: 4, 'very high': 4, 'tres eleve': 4, moderate: 2, modere: 2, low: 1, faible: 1, none: 0, aucun: 0 })[normal(e?.state) as 'high'] ?? finite(e?.state);
      if (level !== undefined && level >= 3 && level <= 4) add({ key: `legacy-${p.id}`, group: 'environment', severity: level === 4 ? 2 : 1, text: `${p.nom} : pollens ${level === 4 ? 'très élevés' : 'élevés'}`, explanation: 'Niveau Polleninformation sur son échelle 0–4, distincte de l’échelle Atmo.', entity: p.id, icon: 'mdi:flower-pollen' });
    }
  }
  const official = config.vigilance_entity ? hass.states[config.vigilance_entity] : undefined;
  if (config.vigilance_entity) {
    const recognized = official && (/meteo.?france/.test(normal(official.attributes.attribution)) || hass.entities?.[config.vigilance_entity]?.platform === 'meteo_france');
    const level = recognized ? knownColor(official.state) : undefined;
    const stamp = Date.parse(official?.last_updated ?? ''), old = Number.isFinite(stamp) && now.getTime() - stamp > 48 * 3600_000;
    if (level === undefined || old) caveats.push('Vigilance officielle indisponible, non reconnue ou ancienne : consulter Météo-France.');
    else if (level > 0) {
      const phenomena = Object.entries(official!.attributes).filter(([key, value]) => !['attribution', 'friendly_name', 'icon'].includes(key) && knownColor(value) !== undefined && knownColor(value)! > 0).map(([key, value]) => `${key} (${normal(value)})`);
      add({ key: 'official', group: 'official', severity: level as 1 | 2 | 3, text: `Vigilance Météo-France ${['verte', 'jaune', 'orange', 'rouge'][level]}${phenomena.length ? ' : ' + phenomena.join(', ') : ''}`,
        explanation: 'Vigilance officielle du département configuré. Elle fixe un niveau minimal d’attention sans masquer le vent, la pluie ou la pollution. Ouvrir le capteur et consulter les consignes officielles.', entity: config.vigilance_entity, icon: 'mdi:alert-outline' });
    }
  }
  const severity = Math.max(0, ...signals.map(s => s.severity));
  const groupOrder = { official: 0, now: 1, future: 2, environment: 3 };
  signals.sort((x, y) => y.severity - x.severity || groupOrder[x.group] - groupOrder[y.group] || x.key.localeCompare(y.key));
  const phrases = (group: BriefSignal['group']) => signals.filter(s => s.group === group).slice(0, 2).map(s => s.text).join(' ; ');
  const lines = [`Maintenant : ${current}${phrases('now') ? ' ' + phrases('now') + '.' : ''}`];
  const future = phrases('future'); if (future) lines.push(`À venir : ${future}.`);
  else if (!upcoming.length) lines.push('À venir : prévisions indisponibles.');
  const environment = phrases('environment'); if (environment) lines.push(`Air et pollens : ${environment}.`);
  const officialText = phrases('official'); if (officialText) lines.push(officialText + '.');
  const omitted = ['now', 'future', 'environment'].reduce((sum, g) => sum + signals.filter(s => s.group === g).slice(2).filter(s => s.severity > 0).length, 0);
  if (omitted > 0) lines.push(`${omitted} autre${omitted > 1 ? 's' : ''} point${omitted > 1 ? 's' : ''} à consulter dans les explications.`);
  const available = feels !== undefined || signals.length > 0 || upcoming.length > 0;
  const officialSignal = signals.find(s => s.key === 'official');
  const themes: Record<string, string> = { wind: 'Vent', 'wind-rain': 'Pluie et vent', 'rain-now': 'Pluie', 'rain-future': 'Pluie', storm: 'Orage', temperature: feels !== undefined && feels >= 34 ? 'Chaleur' : 'Froid', 'freeze-future': 'Froid', 'frost-night': 'Gel', fog: 'Brouillard', uv: 'UV' };
  const topics = [...new Set(signals.filter(s => s.severity > 0 && s.group !== 'official').map(s => themes[s.key] ?? (s.key.startsWith('air-') || s.key.startsWith('atmo-event') ? 'Air extérieur' : s.group === 'environment' ? 'Pollens' : 'Météo')))];
  const title = officialSignal && officialSignal.severity === severity ? `Vigilance Météo-France ${['verte', 'jaune', 'orange', 'rouge'][officialSignal.severity]}`
    : topics.length ? topics.slice(0, 3).join(' · ') : 'Votre météo en bref';
  return { title, label: !available ? 'Données insuffisantes' : severity === 0 && caveats.length ? 'Synthèse partielle' : levels[severity], rgb: available ? colors[severity] : '150,150,150',
    icon: signals.find(s => s.severity > 0)?.icon ?? 'mdi:weather-partly-cloudy', summary: lines.join('\n'), signals, caveats: [...new Set(caveats)], available };
}

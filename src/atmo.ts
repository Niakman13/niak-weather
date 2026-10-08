import type { AtmoField, AtmoMetric, HassEntity, HomeAssistant, WeatherCardConfig, HomeAssistantEntityRegistryEntry as Registry } from './types';
import type { RegistryContext } from './station-detection';
import { dateFormat } from './intl-cache';

// Contract verified against sebcaps/atmofrance const.py and sensor.py (2.1.2).
// Pollution sensors are indices, NOT pollutant concentrations. Pollen levels use 1..6; 0 is missing.
export const atmoMetrics: Record<AtmoMetric, { label: string; key: string; match: RegExp; icon: string }> = {
  air: { label: 'Air extérieur — indice global', key: 'code_qual', match: /qualite.*globale(?!.*pollen)/, icon: 'mdi:air-filter' },
  pm25: { label: 'PM2.5 — sous-indice', key: 'code_pm25', match: /pm2[._\s]?5/, icon: 'mdi:blur' },
  pm10: { label: 'PM10 — sous-indice', key: 'code_pm10', match: /pm10/, icon: 'mdi:blur' },
  no2: { label: 'NO₂ — sous-indice', key: 'code_no2', match: /dioxyde.*azote|\bno2\b/, icon: 'mdi:molecule' },
  o3: { label: 'O₃ — sous-indice', key: 'code_o3', match: /ozone|\bo3\b/, icon: 'mdi:molecule' },
  so2: { label: 'SO₂ — sous-indice', key: 'code_so2', match: /dioxyde.*soufre|\bso2\b/, icon: 'mdi:molecule' },
  pollen: { label: 'Pollens — indice global', key: 'code_qual', match: /qualite.*globale.*pollen|pollen.*(?:global|index|indice)/, icon: 'mdi:flower-pollen' },
  grass: { label: 'Graminées', key: 'code_gram', match: /gramin/, icon: 'mdi:grass' },
  ragweed: { label: 'Ambroisie', key: 'code_ambr', match: /ambroisie|ragweed/, icon: 'mdi:flower-pollen' },
  mugwort: { label: 'Armoise', key: 'code_arm', match: /armoise|mugwort/, icon: 'mdi:flower-pollen' },
  alder: { label: 'Aulne', key: 'code_aul', match: /aulne|alder/, icon: 'mdi:tree-outline' },
  birch: { label: 'Bouleau', key: 'code_boul', match: /bouleau|birch/, icon: 'mdi:tree-outline' },
  olive: { label: 'Olivier', key: 'code_oliv', match: /olivier|olive/, icon: 'mdi:fruit-cherries' },
  grass_concentration: { label: 'Concentration — Graminées', key: 'conc_gram', match: /gramin/, icon: 'mdi:grass' },
  ragweed_concentration: { label: 'Concentration — Ambroisie', key: 'conc_ambr', match: /ambroisie|ragweed/, icon: 'mdi:flower-pollen' },
  mugwort_concentration: { label: 'Concentration — Armoise', key: 'conc_arm', match: /armoise|mugwort/, icon: 'mdi:flower-pollen' },
  alder_concentration: { label: 'Concentration — Aulne', key: 'conc_aul', match: /aulne|alder/, icon: 'mdi:tree-outline' },
  birch_concentration: { label: 'Concentration — Bouleau', key: 'conc_boul', match: /bouleau|birch/, icon: 'mdi:tree-outline' },
  olive_concentration: { label: 'Concentration — Olivier', key: 'conc_oliv', match: /olivier|olive/, icon: 'mdi:fruit-cherries' },
};
export const pollenMetrics: AtmoMetric[] = ['grass', 'ragweed', 'mugwort', 'alder', 'birch', 'olive'];
export const pollutantMetrics: AtmoMetric[] = ['pm25', 'pm10', 'no2', 'o3', 'so2'];
export const atmoField = (metric: AtmoMetric, tomorrow = false): AtmoField => `atmo_${metric}${tomorrow ? '_tomorrow' : ''}_entity`;
export const atmoFields = [false, true].flatMap(tomorrow => (Object.keys(atmoMetrics) as AtmoMetric[]).map(metric => atmoField(metric, tomorrow)));
export const normal = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const text = (e: HassEntity, r?: Registry) => normal(`${e.entity_id} ${e.attributes.friendly_name ?? ''} ${r?.original_name ?? ''} ${r?.unique_id ?? ''} ${r?.translation_key ?? ''}`);
function isAtmo(e: HassEntity, r?: Registry): boolean {
  // Do not mistake a generic AQI, polleninformation, or indoor PM sensor for Atmo France.
  return r?.platform === 'atmofrance' || /atmo[ _-]?france/.test(normal(e.attributes.attribution));
}
function tomorrow(e: HassEntity, r?: Registry): boolean {
  return /(?:\bj\s*[+_ -]\s*1\b|\bdemain\b|\btomorrow\b|_j_?1(?:_|\b))/.test(text(e, r));
}
function area(e: HassEntity, r?: Registry): string {
  const zone = e.attributes['Nom de la zone'];
  if (zone) return `zone:${normal(e.attributes['Type de zone'])}:${normal(zone)}`;
  if (r?.config_entry_id) return `entry:${r.config_entry_id}`;
  // No geographic metadata: do not mix unknown locations by assuming the whole integration is one city.
  return '';
}
export function atmoAreas(hass: Pick<HomeAssistant, 'states'>, context?: RegistryContext): Array<{ value: string; label: string }> {
  const regs = new Map(context?.entities.map(r => [r.entity_id, r]));
  const groups = new Map<string, string>();
  for (const e of Object.values(hass.states)) {
    const r = regs.get(e.entity_id); if (!isAtmo(e, r) || r?.disabled_by) continue;
    const key = area(e, r); if (!key) continue;
    groups.set(key, String(e.attributes['Nom de la zone'] ?? context?.devices.find(d => d.id === r?.device_id)?.name_by_user ?? 'Atmo France'));
  }
  const values = [...groups].map(([value, label]) => ({ value, label }));
  // Duplicate measures from two accounts in one zone stay ambiguous at entity selection.
  return values.map(v => ({ ...v, label: values.filter(a => a.label === v.label).length > 1 ? `${v.label} (${v.value.slice(-6)})` : v.label })).sort((a, b) => a.label.localeCompare(b.label));
}
export function atmoCandidates(hass: Pick<HomeAssistant, 'states'>, field: AtmoField, context?: RegistryContext, config: Partial<WeatherCardConfig> = {}): string[] {
  const next = field.includes('_tomorrow_entity'), metric = field.slice(5).replace(/(?:_tomorrow)?_entity$/, '') as AtmoMetric;
  const spec = atmoMetrics[metric]; if (!spec) return [];
  const regs = new Map(context?.entities.map(r => [r.entity_id, r]));
  return Object.values(hass.states).filter(e => {
    const r = regs.get(e.entity_id); if (!e.entity_id.startsWith('sensor.') || r?.disabled_by || !isAtmo(e, r) || tomorrow(e, r) !== next) return false;
    if (config.atmo_area && area(e, r) !== config.atmo_area) return false;
    const t = text(e, r), concentration = metric.endsWith('_concentration');
    const isConcentration = /concentration|\bconc_/.test(t) || !!e.attributes.unit_of_measurement;
    if (concentration !== isConcentration) return false;
    if (metric === 'air' && /pollen/.test(t)) return false;
    if (metric === 'pollen' && !/pollen/.test(t)) return false;
    // HA allows renaming entities; the integration's immutable unique_id/original_name retains the measure.
    return spec.match.test(t) || (spec.key !== 'code_qual' && normal(r?.translation_key) === spec.key);
  }).map(e => e.entity_id).sort();
}
export function detectAtmo(hass: Pick<HomeAssistant, 'states'>, context?: RegistryContext, config: Partial<WeatherCardConfig> = {}): Partial<WeatherCardConfig> {
  const found: Partial<WeatherCardConfig> = {};
  const groups = atmoAreas(hass, context);
  const regs = new Map(context?.entities.map(r => [r.entity_id, r]));
  const selectedAreas = new Set(atmoFields.map(field => {
    const e = hass.states[config[field] ?? '']; return e ? area(e, regs.get(e.entity_id)) : '';
  }).filter(Boolean));
  const desired = normal(config.location || hass.states[config.weather_entity ?? '']?.attributes.friendly_name);
  const matches = groups.filter(g => normal(g.label) === desired);
  const chosen = config.atmo_area ?? (selectedAreas.size === 1 ? [...selectedAreas][0] : groups.length === 1 ? groups[0].value : matches.length === 1 ? matches[0].value : undefined);
  if (!chosen) return found;
  if (config.atmo_area === undefined) found.atmo_area = chosen;
  if (config.pollen_source === undefined) found.pollen_source = 'atmo';
  for (const field of atmoFields) {
    if (config[field] !== undefined) continue;
    const ids = atmoCandidates(hass, field, context, { ...config, atmo_area: chosen });
    if (ids.length === 1) found[field] = ids[0];
  }
  return found;
}

const airLabels = ['Indisponible', 'Bon', 'Moyen', 'Dégradé', 'Mauvais', 'Très mauvais', 'Extrêmement mauvais', 'Événement'];
const pollenLabels = ['Indisponible', 'Très faible', 'Faible', 'Modéré', 'Élevé', 'Très élevé', 'Extrêmement élevé'];
const colors = ['#969696', '#50f0e6', '#50ccaa', '#f0e641', '#ff5050', '#960032', '#872181', '#888888'];
export interface AtmoReading { id: string; label: string; value?: number; color: string; zone: string; updated: string; unit?: string; stale: boolean; }
export function atmoReading(hass: Pick<HomeAssistant, 'states' | 'config'>, id: string | undefined, pollen: boolean, concentration = false, now = new Date()): AtmoReading | undefined {
  if (!id) return;
  const e = hass.states[id], a = e?.attributes ?? {}, raw = e?.state;
  const n = raw && !['unavailable', 'unknown'].includes(raw) ? Number(raw) : NaN;
  const valid = Number.isFinite(n) && (concentration ? n >= 0 : Number.isInteger(n) && n >= 1 && n <= (pollen ? 6 : 7)) && (concentration || !a.unit_of_measurement);
  const label = valid ? String(a['Libellé'] ?? (pollen ? pollenLabels[n] : airLabels[n]) ?? '') : 'Indisponible';
  const color = valid && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(String(a['Couleur'])) ? String(a['Couleur']) : valid && !concentration ? colors[n] : colors[0];
  const stamp = a['Date de mise à jour'];
  // Atmo exposes date_maj (publication), not date_ech (forecast validity): don't claim a date_ech we cannot verify.
  const date = typeof stamp === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(stamp) ? stamp + 'Z' : stamp) : null;
  const dated = date && Number.isFinite(date.getTime());
  const updated = dated ? dateFormat('fr-FR', { timeZone: hass.config?.time_zone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date) : '';
  return { id, label, value: valid ? n : undefined, color, zone: String(a['Nom de la zone'] ?? ''), updated,
    unit: concentration ? String(a.unit_of_measurement ?? '') : undefined, stale: !!dated && now.getTime() - date.getTime() > 48 * 3600_000 };
}

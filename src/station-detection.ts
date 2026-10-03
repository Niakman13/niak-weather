import type { HassEntity, HomeAssistant, WeatherCardConfig } from "./types";

type Metric = Exclude<keyof WeatherCardConfig, "type" | "weather_entity" | "name" | "mode">;

const metricRules: Record<Metric, { deviceClasses: string[]; id: RegExp; units: RegExp }> = {
  temperature_entity: { deviceClasses: ["temperature"], id: /(?:outdoor|outside|exterieur|external|temp)/i, units: /°[CF]/i },
  humidity_entity: { deviceClasses: ["humidity"], id: /(?:outdoor|outside|exterieur|external|humid)/i, units: /%/ },
  humidex_entity: { deviceClasses: ["temperature"], id: /humidex/i, units: /°[CF]/i },
  humidex_perception_entity: { deviceClasses: [], id: /(?:thermal.*comfort.*(?:sensation|perception)|(?:sensation|perception).*humidex)/i, units: /.*/ },
  comfort_entity: { deviceClasses: [], id: /(?:confort.*(?:ouvr|aeration)|(?:ouvr|aeration).*confort)/i, units: /.*/ },
  wind_speed_entity: { deviceClasses: ["wind_speed"], id: /(?:wind.*(?:speed|vitesse)|(?:speed|vitesse).*wind|vent)/i, units: /(?:km\/h|m\/s|mph|kn)/i },
  wind_gust_entity: { deviceClasses: ["wind_speed"], id: /(?:gust|rafale)/i, units: /(?:km\/h|m\/s|mph|kn)/i },
  wind_bearing_entity: { deviceClasses: ["wind_bearing"], id: /(?:wind.*(?:bearing|direction)|(?:bearing|direction).*wind|vent.*direction)/i, units: /(?:°|deg)/i },
  rain_rate_entity: { deviceClasses: ["precipitation_intensity"], id: /(?:rain.*(?:rate|intensity)|(?:rate|intensity).*rain|pluie.*(?:taux|intensite)|precipitation)/i, units: /(?:mm|in)\s*\/?\s*h/i },
  daily_rain_entity: { deviceClasses: ["precipitation"], id: /(?:daily|today|jour|quotidien).*rain|rain.*(?:daily|today|jour|quotidien)|pluie.*(?:jour|quotidien)/i, units: /(?:mm|in)/i },
  rain_24h_entity: { deviceClasses: ["precipitation"], id: /(?:24h|24_h).*rain|rain.*(?:24h|24_h)|pluie.*24/i, units: /(?:mm|in)/i },
  weekly_rain_entity: { deviceClasses: ["precipitation"], id: /(?:weekly|week|semaine).*rain|rain.*(?:weekly|week|semaine)|pluie.*semaine/i, units: /(?:mm|in)/i },
  monthly_rain_entity: { deviceClasses: ["precipitation"], id: /(?:monthly|month|mois).*rain|rain.*(?:monthly|month|mois)|pluie.*mois/i, units: /(?:mm|in)/i },
  yearly_rain_entity: { deviceClasses: ["precipitation"], id: /(?:yearly|year|annual|an).*rain|rain.*(?:yearly|year|annual|an)|pluie.*(?:an|annuel)/i, units: /(?:mm|in)/i },
  event_rain_entity: { deviceClasses: ["precipitation"], id: /(?:event|episode).*rain|rain.*(?:event|episode)|pluie.*(?:event|episode)/i, units: /(?:mm|in)/i },
  pressure_entity: { deviceClasses: ["atmospheric_pressure", "pressure"], id: /(?:relative.*pressure|pressure.*relative|pression)/i, units: /(?:hpa|mbar|pa)/i },
  solar_radiation_entity: { deviceClasses: ["irradiance"], id: /(?:solar.*radiation|radiation.*solar|solar)/i, units: /w\s*\/?\s*m/i },
  dew_point_entity: { deviceClasses: ["temperature"], id: /(?:dew.*point|point.*rosee|rosee)/i, units: /°[CF]/i },
  uv_index_entity: { deviceClasses: ["uv_index"], id: /(?:uv.*index|index.*uv|\buv\b)/i, units: /.*/ },
  illuminance_entity: { deviceClasses: ["illuminance"], id: /(?:lux|illuminance|luminos)/i, units: /lx/i },
  lightning_distance_entity: { deviceClasses: ["distance"], id: /(?:lightning|foudre)/i, units: /(?:km|mi|m)/i },
};

function text(entity: HassEntity): string {
  return `${entity.entity_id} ${String(entity.attributes.friendly_name ?? "")}`;
}

function score(entity: HassEntity, rule: (typeof metricRules)[Metric]): number {
  const deviceClass = String(entity.attributes.device_class ?? "");
  const unit = String(entity.attributes.unit_of_measurement ?? "");
  const entityText = text(entity);
  let result = 0;
  if (rule.deviceClasses.includes(deviceClass)) result += 100;
  if (rule.id.test(entityText)) result += 70;
  if (rule.units.test(unit)) result += 30;
  if (/(?:ecowitt|gw\d{4}|wh\d{2})/i.test(entityText)) result += 25;
  return result;
}

function stationPrefix(entityId: string): string {
  const objectId = entityId.split(".")[1] ?? "";
  const tokens = objectId.split("_");
  return tokens.slice(0, Math.max(1, tokens.length - 1)).join("_");
}

/**
 * Selects only high-confidence sensors. A display field stays empty when the
 * setup is ambiguous; the editor always lets the user choose another entity.
 */
export function detectEcowittStation(hass: Pick<HomeAssistant, "states">): Partial<WeatherCardConfig> {
  const sensors = Object.values(hass.states).filter((entity) => entity.entity_id.startsWith("sensor."));
  const selected: Partial<WeatherCardConfig> = {};
  const initial = Object.entries(metricRules).map(([metric, rule]) => {
    const ranked = sensors
      .map((entity) => ({ entity, score: score(entity, rule) }))
      .filter((candidate) => candidate.score >= 100)
      .sort((left, right) => right.score - left.score);
    return [metric as Metric, ranked] as const;
  });

  const temperature = initial.find(([metric]) => metric === "temperature_entity")?.[1][0];
  const prefix = temperature ? stationPrefix(temperature.entity.entity_id) : undefined;

  for (const [metric, candidates] of initial) {
    const best = candidates
      .map((candidate) => ({
        ...candidate,
        score: candidate.score + (prefix && stationPrefix(candidate.entity.entity_id) === prefix ? 40 : 0),
      }))
      .sort((left, right) => right.score - left.score)[0];
    if (best && best.score >= 100) selected[metric] = best.entity.entity_id;
  }
  return selected;
}

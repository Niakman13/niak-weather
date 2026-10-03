import type { HassEntity, HomeAssistant, WeatherCardConfig } from "./types";

type Metric = Exclude<keyof WeatherCardConfig, "type" | "weather_entity" | "name" | "mode">;

const metricRules: Record<Metric, { deviceClasses: string[]; id: RegExp; units: RegExp }> = {
  temperature_entity: { deviceClasses: ["temperature"], id: /(?:outdoor|outside|exterieur|external|temp)/i, units: /°[CF]/i },
  humidity_entity: { deviceClasses: ["humidity"], id: /(?:outdoor|outside|exterieur|external|humid)/i, units: /%/ },
  wind_speed_entity: { deviceClasses: ["wind_speed"], id: /(?:wind.*(?:speed|vitesse)|(?:speed|vitesse).*wind|vent)/i, units: /(?:km\/h|m\/s|mph|kn)/i },
  rain_rate_entity: { deviceClasses: ["precipitation_intensity"], id: /(?:rain.*(?:rate|intensity)|(?:rate|intensity).*rain|pluie.*(?:taux|intensite)|precipitation)/i, units: /(?:mm|in)\s*\/?\s*h/i },
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

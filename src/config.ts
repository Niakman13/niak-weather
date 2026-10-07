import type { WeatherCardConfig } from './types';

/** Remove obsolete options while preserving explicit section choices. */
export function cleanConfig(config: WeatherCardConfig): WeatherCardConfig {
  const copy = { ...config } as WeatherCardConfig & {
    mode?: string; lightning_distance_entity?: string; comfort_entity?: string;
    air_quality_entity?: string; model_entity?: string; forecast_entity?: string; air_path?: string;
  } & Record<string, unknown>;
  if (copy.mode === 'compact' && copy.show_predictions === undefined) copy.show_predictions = false;
  delete copy.mode;
  delete copy.lightning_distance_entity; delete copy.comfort_entity;
  delete copy.air_quality_entity; delete copy.model_entity; delete copy.forecast_entity; delete copy.air_path;
  // Thermal Comfort is no longer needed: humidex, dew and frost points are computed by the card.
  for (const key of ['humidex_entity', 'humidex_perception_entity', 'thermal_dew_point_entity', 'heat_index_entity', 'absolute_humidity_entity', 'thermal_perception_entity', 'thermal_device_id']) delete copy[key];
  return copy;
}

import type { WeatherCardConfig } from './types';

/** Remove obsolete options while preserving explicit section choices. */
export function cleanConfig(config: WeatherCardConfig): WeatherCardConfig {
  const copy = { ...config } as WeatherCardConfig & {
    mode?: string; lightning_distance_entity?: string; comfort_entity?: string;
    air_quality_entity?: string; model_entity?: string; forecast_entity?: string; air_path?: string;
  };
  if (copy.mode === 'compact' && copy.show_predictions === undefined) copy.show_predictions = false;
  delete copy.mode;
  delete copy.lightning_distance_entity; delete copy.comfort_entity;
  delete copy.air_quality_entity; delete copy.model_entity; delete copy.forecast_entity; delete copy.air_path;
  return copy;
}

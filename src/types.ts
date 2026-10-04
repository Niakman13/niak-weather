export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale: { language: string };
  formatEntityState(state: HassEntity): string;
  formatEntityName(state: HassEntity): string;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  config?: { time_zone?: string };
  entities?: Record<string, HomeAssistantEntityRegistryEntry>;
}

export interface HomeAssistantEntityRegistryEntry {
  entity_id?: string;
  device_id?: string;
  platform?: string;
  unique_id?: string;
  translation_key?: string;
  original_name?: string;
  config_entry_id?: string;
  disabled_by?: string | null;
}

export interface WeatherForecast {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  precipitation?: number;
}

export interface ForecastResponse {
  response?: Record<string, { forecast?: WeatherForecast[] }>;
}

export interface WeatherCardConfig {
  type: "custom:niak-weather-card";
  weather_entity: string;
  temperature_entity?: string;
  humidity_entity?: string;
  humidex_entity?: string;
  humidex_perception_entity?: string;
  wind_speed_entity?: string;
  wind_gust_entity?: string;
  wind_bearing_entity?: string;
  rain_rate_entity?: string;
  daily_rain_entity?: string;
  rain_24h_entity?: string;
  weekly_rain_entity?: string;
  monthly_rain_entity?: string;
  yearly_rain_entity?: string;
  event_rain_entity?: string;
  pressure_entity?: string;
  solar_radiation_entity?: string;
  dew_point_entity?: string;
  uv_index_entity?: string;
  illuminance_entity?: string;
  max_daily_gust_entity?: string;
  temperature_trend_entity?: string;
  sun_entity?: string;
  sun_elevation_entity?: string;
  thermal_dew_point_entity?: string;
  heat_index_entity?: string;
  absolute_humidity_entity?: string;
  thermal_perception_entity?: string;
  air_quality_entity?: string;
  model_entity?: string;
  forecast_entity?: string;
  forecast_source?: string;
  weather_path?: string;
  air_path?: string;
  location?: string;
  station_device_id?: string;
  thermal_device_id?: string;
  pollens?: Array<{ id: string; nom: string; ico?: string }>;
  name?: string;
  mode?: "compact" | "detailed";
}

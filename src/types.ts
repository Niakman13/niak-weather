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
}

export interface HomeAssistantEntityRegistryEntry {
  device_id?: string;
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
  comfort_entity?: string;
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
  lightning_distance_entity?: string;
  name?: string;
  mode?: "compact" | "detailed";
}

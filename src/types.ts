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
  wind_speed_entity?: string;
  rain_rate_entity?: string;
  name?: string;
  mode?: "compact" | "detailed";
}

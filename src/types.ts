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
}

export interface WeatherCardConfig {
  type: "custom:niak-weather-card";
  weather_entity: string;
  temperature_entity?: string;
  humidity_entity?: string;
  wind_speed_entity?: string;
  rain_rate_entity?: string;
  name?: string;
}

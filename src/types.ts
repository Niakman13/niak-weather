export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_updated?: string;
}

/** The part of Home Assistant's websocket connection the card uses. */
export interface HassConnection {
  /** Subscribes to a command's events; resolves to the function that stops it, rejects with `{ code, message }`. */
  subscribeMessage<T>(callback: (message: T) => void, message: Record<string, unknown>): Promise<() => Promise<void>>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale: { language: string };
  connection?: HassConnection;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
}

/** The card's own settings: what it shows and how. Its sources (weather, station, air) are set in the Niak Weather integration. */
export interface WeatherCardConfig {
  type: 'custom:niak-weather-card';
  /** The integration's place to show; may be left out when there is only one. */
  entry_id?: string;
  /** full (default): the weather page. tile: one band that unfolds on tap. intermediate: the same tile, unfolded at first.
   *  On the small formats a long press opens the full card, or weather_path when it is set. */
  format?: 'full' | 'intermediate' | 'tile';
  /** Full card: start with « Aujourd'hui » or « Prévisions » folded. */
  collapse_today?: boolean;
  collapse_predictions?: boolean;
  smart_brief?: boolean;
  show_synthesis?: boolean;
  show_today?: boolean;
  /** The day's bulletin in the banner, and in the unfolded tile. */
  show_bulletin?: boolean;
  show_predictions?: boolean;
  show_atmo_details?: boolean;
  show_atmo_tomorrow?: boolean;
  weather_animations?: boolean;
  weather_animation_quality?: 'low' | 'standard';
  weather_path?: string;
  /** Before 2.0 the card held its sources; they stay in old dashboards, for the integration to take over. */
  weather_entity?: string;
}

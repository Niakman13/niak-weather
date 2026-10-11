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

/** A block of the unfolded tile. */
export type TileBlock = 'bulletin' | 'events' | 'moments' | 'forecast';
/** A block of the full card: bulletin, events, moments and forecast (the tile's hours/days strip) go in the banner while they come
 *  first; today, predictions (the curve and the 7 days) and air are sections. */
export type FullBlock = 'bulletin' | 'events' | 'moments' | 'forecast' | 'today' | 'predictions' | 'air';
export type TodayBlock = 'comfort' | 'rain' | 'wind' | 'pressure' | 'extras';
export type ForecastBlock = 'hours' | 'days';
export type AirBlock = 'air' | 'pollen' | 'tomorrow';

/** The card's own settings: what it shows and how. Its sources (weather, station, air) are set in the Niak Weather integration. */
export interface WeatherCardConfig {
  type: 'custom:niak-weather-card';
  /** The integration's place to show; may be left out when there is only one. */
  entry_id?: string;
  /** full (default): the weather page. tile: one band that unfolds on tap. intermediate: the same tile, unfolded at first.
   *  mini: one line. forecast: the hours and the days alone. rain: the rain to come and the rain that fell.
   *  alert: only while there is a vigilance or an alert, hidden otherwise.
   *  On the small formats a long press (a tap on mini and alert) does what hold_action says. */
  format?: 'full' | 'intermediate' | 'tile' | 'mini' | 'forecast' | 'rain' | 'alert';
  /** What the unfolded tile shows, in this order. Default: the bulletin, then the events. */
  tile_blocks?: TileBlock[];
  /** What the full card shows, exactly in this order. The banner (place, vigilance, weather now) always leads and takes the blocks
   *  that come before the first section; a banner block placed after a section shows there. Unset, the switches (show_*) decide. */
  full_blocks?: FullBlock[];
  /** Inside the sections, what shows and in which order. Unset: everything. */
  today_blocks?: TodayBlock[];
  forecast_blocks?: ForecastBlock[];
  air_blocks?: AirBlock[];
  /** What a long press on the tile (a tap on mini and alert) does: popup, the full weather over the page; page, opens weather_path;
   *  none, nothing (the tile then only folds and unfolds). Default: page when weather_path is set, popup otherwise. */
  hold_action?: 'popup' | 'page' | 'none';
  /** The forecasts open on the hours or on the days (the tile's « Prévisions » block and the forecast card). */
  forecast_tab?: 'hours' | 'days';
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
  /** Frosted glass over the sky (blur). Off, the glass is plain and more opaque: lighter for slow devices. */
  glass_effect?: boolean;
  weather_animation_quality?: 'low' | 'standard';
  weather_path?: string;
  /** Before 2.0 the card held its sources; they stay in old dashboards, for the integration to take over. */
  weather_entity?: string;
}

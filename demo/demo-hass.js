// Données de démonstration partagées par le banc visuel et la maquette : un faux Home Assistant
// (états, prévisions, vigilance Météo-France, Atmo France) décrit par un « scénario ».
//   scenario = { condition, phase: 'day'|'twilight'|'night', season, vigilance: 'Jaune'|'Orange'|'Rouge', phenomenon,
//                station: false, atmo: false, forecasts: false, unavailable: true, wind, gust, temperature, format, animated }

const PHASES = { day: 35, twilight: 1, night: -20 };
const sensor = (id, value, unit) => ({ entity_id: id, state: String(value), attributes: unit ? { unit_of_measurement: unit } : {} });

/** Prévisions réalistes : cycle jour/nuit, averse demain matin, 7 jours variés. */
export function demoForecasts(temp, rain, now = new Date()) {
  const t0 = new Date(now); t0.setMinutes(0, 0, 0);
  const hourly = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(t0.getTime() + (i + 1) * 3600_000), hr = d.getHours();
    const p = i >= 11 && i <= 17 ? [0.3, 0.8, 1.6, 2.4, 1.8, 1.1, 0.5][i - 11] : i < 2 ? rain : 0;
    return { datetime: d.toISOString(), temperature: Math.round((temp - 4 + 5 * Math.cos((hr - 15) / 24 * 2 * Math.PI)) * 10) / 10, precipitation: p,
      precipitation_probability: p ? 80 : 10, wind_speed: i > 10 ? 18 : 9, wind_bearing: 200,
      condition: p > 3 ? 'pouring' : p ? 'rainy' : (hr >= 20 || hr < 7) ? 'clear-night' : 'partlycloudy' };
  });
  const dc = ['partlycloudy', 'pouring', 'rainy', 'cloudy', 'sunny', 'sunny', 'partlycloudy'], lo = [16, 15, 13, 12, 11, 12, 13], hi = [25, 21, 19, 20, 22, 23, 22], rr = [0, 18.4, 3.2, 0, 0, 0, 0];
  const daily = dc.map((c, i) => ({ datetime: new Date(t0.getTime() + i * 86400_000).toISOString(), condition: c, temperature: hi[i], templow: lo[i], precipitation: rr[i], wind_speed: i === 1 ? 28 : 12, wind_bearing: 200 }));
  return { hourly, daily };
}

/** Valeurs de base d'un scénario : température, pluie en cours, vent. */
export function demoWeather(s) {
  const condition = s.condition ?? 'partlycloudy', night = s.phase === 'night';
  return {
    condition, night,
    temp: s.temperature ?? (condition.startsWith('snow') || condition === 'hail' ? -1.5 : night ? 14.6 : 22.4),
    rain: ['rainy', 'lightning-rainy', 'snowy-rainy'].includes(condition) ? 1.4 : condition === 'pouring' ? 8.2 : 0,
    wind: s.wind ?? (condition.startsWith('windy') ? 42 : 8), gust: s.gust ?? (condition.startsWith('windy') ? 62 : 14),
  };
}

/** Construit l'état Home Assistant d'un scénario : météo, station, vigilance, Atmo et prévisions. */
export function scenarioHass(s) {
  const now = new Date(), { condition, night, temp, rain, wind, gust } = demoWeather(s);
  const states = {
    'weather.demo': s.unavailable ? { entity_id: 'weather.demo', state: 'unavailable', attributes: { friendly_name: 'Gardanne' } }
      : { entity_id: 'weather.demo', state: condition, attributes: { friendly_name: 'Gardanne', temperature: temp, temperature_unit: '°C', humidity: 74, pressure: 1013,
        wind_speed: wind, wind_gust_speed: gust, wind_bearing: 200, attribution: 'Météo-France', wind_speed_unit: 'km/h', precipitation_unit: 'mm', pressure_unit: 'hPa' } },
    'sun.sun': { entity_id: 'sun.sun', state: night ? 'below_horizon' : 'above_horizon', attributes: { elevation: PHASES[s.phase ?? 'day'] } },
    'sensor.season': sensor('sensor.season', s.season ?? 'autumn'),
  };
  if (s.station !== false) Object.assign(states, {
    'sensor.temperature': sensor('sensor.temperature', temp, '°C'), 'sensor.humidity': sensor('sensor.humidity', 78, '%'),
    'sensor.wind': sensor('sensor.wind', wind, 'km/h'), 'sensor.gust': sensor('sensor.gust', gust, 'km/h'),
    'sensor.rain': sensor('sensor.rain', rain, 'mm/h'), 'sensor.rain_day': sensor('sensor.rain_day', rain * 2, 'mm'),
    'sensor.pressure': sensor('sensor.pressure', 1014, 'hPa'), 'sensor.trend': sensor('sensor.trend', -0.4, '°C/h'),
    'sensor.solar': sensor('sensor.solar', night ? 0 : 350, 'W/m²'),
  });
  if (s.vigilance) {
    const attributes = { attribution: 'Data provided by Météo-France', Orages: 'Vert', 'Vent violent': 'Vert', 'Pluie-inondation': 'Vert', Canicule: 'Vert' };
    attributes[s.phenomenon ?? 'Orages'] = s.vigilance;
    states['sensor.vigilance'] = { entity_id: 'sensor.vigilance', state: s.vigilance, last_updated: now.toISOString(), attributes };
  }
  if (s.atmo !== false) {
    const stamp = now.toISOString().slice(0, 19);
    const atmo = (id, v) => ({ entity_id: id, state: String(v), attributes: { 'Nom de la zone': 'Gardanne', 'Date de mise à jour': stamp } });
    Object.assign(states, { 'sensor.atmo_air': atmo('sensor.atmo_air', 2), 'sensor.atmo_air_j1': atmo('sensor.atmo_air_j1', 2),
      'sensor.atmo_pollen': atmo('sensor.atmo_pollen', 1), 'sensor.atmo_pollen_j1': atmo('sensor.atmo_pollen_j1', 2) });
  }
  const { hourly, daily } = demoForecasts(temp, rain, now);
  const callWS = async m => {
    if (m.type !== 'call_service') return m.type === 'recorder/get_statistics_metadata' ? [] : {};
    if (s.forecasts === false) throw new Error('Prévisions indisponibles');
    return { response: { 'weather.demo': { forecast: m.service_data.type === 'hourly' ? hourly : daily } } };
  };
  return { states, language: 'fr', locale: { language: 'fr' }, config: { time_zone: 'Europe/Paris', latitude: 43.45, longitude: 5.47 }, callWS, entities: {} };
}

/** Configuration de la carte pour un scénario (les champs absents imitent une installation minimale). */
export function scenarioConfig(s) {
  const station = s.station !== false;
  return { type: 'custom:niak-weather-card', format: s.format ?? 'full', weather_entity: 'weather.demo', location: 'Gardanne', weather_path: '/meteo',
    season_entity: 'sensor.season', forecast_source: 'Météo-France', weather_animations: s.animated ?? false,
    ...(s.vigilance ? { vigilance_entity: 'sensor.vigilance' } : {}),
    ...(station ? { temperature_entity: 'sensor.temperature', humidity_entity: 'sensor.humidity', wind_speed_entity: 'sensor.wind', wind_gust_entity: 'sensor.gust',
      rain_rate_entity: 'sensor.rain', daily_rain_entity: 'sensor.rain_day', pressure_entity: 'sensor.pressure', temperature_trend_entity: 'sensor.trend',
      solar_radiation_entity: 'sensor.solar' } : {}),
    ...(s.atmo !== false ? { atmo_air_entity: 'sensor.atmo_air', atmo_air_tomorrow_entity: 'sensor.atmo_air_j1', atmo_pollen_entity: 'sensor.atmo_pollen',
      atmo_pollen_tomorrow_entity: 'sensor.atmo_pollen_j1', pollen_source: 'atmo', show_atmo_tomorrow: true } : { pollen_source: 'none' }) };
}

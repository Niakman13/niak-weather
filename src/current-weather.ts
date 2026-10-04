import { finite, measurement } from './local-model';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from './types';

const conditions: Record<string, [string, string]> = {
  sunny:['Ensoleillé','mdi:weather-sunny'], 'clear-night':['Nuit claire','mdi:weather-night'],
  partlycloudy:['Éclaircies','mdi:weather-partly-cloudy'], cloudy:['Ciel couvert','mdi:weather-cloudy'],
  rainy:['Pluie','mdi:weather-rainy'], pouring:['Fortes pluies','mdi:weather-pouring'],
  lightning:['Orage','mdi:weather-lightning'], 'lightning-rainy':['Orage et pluie','mdi:weather-lightning-rainy'],
  snowy:['Neige','mdi:weather-snowy'], 'snowy-rainy':['Pluie et neige','mdi:weather-snowy-rainy'],
  hail:['Grêle','mdi:weather-hail'], fog:['Brouillard','mdi:weather-fog'],
  windy:['Venteux','mdi:weather-windy'], 'windy-variant':['Venteux et nuageux','mdi:weather-windy-variant'],
  exceptional:['Conditions exceptionnelles','mdi:alert-circle-outline'],
};
const available = (e?: HassEntity) => !!e && !['unknown','unavailable'].includes(e.state);
export interface CurrentWeather {
  condition:string; label:string; icon:string; phase:'day'|'night'|'twilight'|'unknown';
  temperature?:number; feels?:number; temperatureEntity?:string; conditionEntity?:string;
  source:string; temperatureSource:string; wind?:number;
}

/** Current conditions only. No future forecast or alert can select the sky. */
export function buildCurrentWeather(hass:HomeAssistant, config:WeatherCardConfig, model:HassEntity):CurrentWeather {
  const weather=hass.states[config.weather_entity], modelAvailable=available(model);
  let condition=available(weather) ? weather!.state.replaceAll('_','-') : 'unknown';
  if(condition==='clear') condition='sunny';
  if(!conditions[condition]) condition='unknown';
  let conditionEntity=condition==='unknown' ? undefined : config.weather_entity;
  let source=condition==='unknown' ? 'État du ciel indisponible' : 'Ciel · bulletin météo';
  const rain=config.rain_rate_entity ? hass.states[config.rain_rate_entity] : undefined;
  const rate=config.rain_rate_entity ? (available(rain) ? measurement(rain!.state,rain!.attributes.unit_of_measurement,'rain') : undefined)
    : modelAvailable ? finite(model.attributes.pluie_taux) : undefined;
  // A rain gauge measures liquid water, not snow, hail, fog or lightning.
  if(rate!==undefined && rate>=.3 && !['snowy','snowy-rainy','hail'].includes(condition)) {
    condition=condition==='lightning' || condition==='lightning-rainy' ? 'lightning-rainy' : rate>=4 ? 'pouring' : 'rainy';
    conditionEntity=config.rain_rate_entity ?? config.weather_entity;
    source=condition==='lightning-rainy' ? 'Pluie mesurée · orage du bulletin' : 'Pluie mesurée ici';
  }
  // A functioning, explicitly selected gauge can contradict the bulletin's rain,
  // but cannot establish sunshine, cloud cover, or the absence of snow/lightning.
  if(config.rain_rate_entity && rate===0 && ['rainy','pouring','lightning-rainy'].includes(condition)) {
    condition=condition==='lightning-rainy' ? 'lightning' : 'cloudy';
    source='Pas de pluie mesurée · ciel du bulletin';conditionEntity=config.rain_rate_entity;
  }
  const sun=hass.states[config.sun_entity ?? 'sun.sun'];
  const elevationSensor=config.sun_elevation_entity ? hass.states[config.sun_elevation_entity] : undefined;
  const elevation=available(elevationSensor) ? finite(elevationSensor!.state) : available(sun) ? finite(sun!.attributes.elevation) : undefined;
  const phase:CurrentWeather['phase']=elevation!==undefined ? elevation>6 ? 'day' : elevation>-6 ? 'twilight' : 'night'
    : available(sun) && ['above_horizon','below_horizon'].includes(sun!.state) ? sun!.state==='above_horizon' ? 'day' : 'night'
    : condition==='clear-night' ? 'night' : typeof weather?.attributes.is_daytime==='boolean' ? weather.attributes.is_daytime ? 'day' : 'night' : 'unknown';
  if(condition==='clear-night' && phase==='day') condition='sunny';
  if(condition==='sunny' && phase==='night') condition='clear-night';
  const sensor=config.temperature_entity ? hass.states[config.temperature_entity] : undefined;
  const temperature=config.temperature_entity ? (available(sensor) ? measurement(sensor!.state,sensor!.attributes.unit_of_measurement,'temperature') : undefined)
    : available(weather) ? measurement(weather!.attributes.temperature,weather!.attributes.temperature_unit,'temperature') : undefined;
  const temperatureEntity=config.temperature_entity ?? config.weather_entity;
  const windSensor=config.wind_speed_entity ? hass.states[config.wind_speed_entity] : undefined;
  const wind=config.wind_speed_entity ? (available(windSensor) ? measurement(windSensor!.state,windSensor!.attributes.unit_of_measurement,'wind') : undefined)
    : modelAvailable ? finite(model.attributes.vent) : undefined;
  const [conditionLabel,icon]=conditions[condition] ?? ['Météo indisponible','mdi:weather-cloudy-alert'];
  const label=source==='Pas de pluie mesurée · ciel du bulletin' && condition==='cloudy' ? 'Nuageux, sans pluie mesurée' : conditionLabel;
  return {condition,label,icon,phase,temperature,temperatureEntity,conditionEntity,source,
    temperatureSource:config.temperature_entity ? 'Thermomètre' : 'Température du bulletin',
    feels:modelAvailable ? finite(model.attributes.ressenti) : undefined,wind};
}

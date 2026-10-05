import { html } from 'lit';
import { finite, measurement } from './local-model';
import type { HassEntity, HomeAssistant, WeatherCardConfig, WeatherForecast } from './types';

export interface CurrentMetric {
  key:'temperature'|'wind'|'rain'|'pressure'; title:string; icon:string;
  value?:number; unit:string; text?:string; description:string; detail?:string;
  source:string; entity:string; fallback?:boolean;
  bearing?:number;
  bearingSource?:string; bearingEntity?:string;
  gust?:{value?:number;source:string;entity:string;fallback?:boolean};
}
const available=(e?:HassEntity)=>!!e && !['unknown','unavailable'].includes(e.state);
export function weatherSourceLabel(hass:HomeAssistant,config:WeatherCardConfig):string {
  const e=hass.states[config.weather_entity];
  return /m[eé]t[eé]o.?france/i.test(`${e?.attributes.attribution ?? ''} ${config.weather_entity}`) ? 'Météo-France' : config.forecast_source || 'Bulletin météo';
}
export function meaningfulComfort(hass:HomeAssistant,config:WeatherCardConfig,model:HassEntity):boolean {
  if (!available(model) || finite(model.attributes.ressenti)===undefined) return false;
  return [config.temperature_entity,config.humidex_entity].some(id=>{
    const e=hass.states[id ?? '']; return available(e) && finite(e!.state)!==undefined;
  });
}
/** Bulletin fallbacks are display-only: never turn forecast rain into a measured local total. */
export function currentMetrics(hass:HomeAssistant,config:WeatherCardConfig,model:HassEntity,hourly:WeatherForecast[]=[],now=new Date()):CurrentMetric[] {
  const weather=hass.states[config.weather_entity], w=available(weather)?weather!.attributes:{};
  const provider=weatherSourceLabel(hass,config), result:CurrentMetric[]=[];
  const local=(id?:string,kind='')=>{
    const e=hass.states[id ?? ''];return available(e)?measurement(e!.state,e!.attributes.unit_of_measurement,kind):undefined;
  };
  const read=(id:string|undefined,attribute:string,unit:string,kind:string)=>{
    const value=local(id,kind);
    const bulletin=measurement(w[attribute],w[unit],kind);
    return value!==undefined || (bulletin===undefined && id) ? {value,source:'Station locale',entity:id!,fallback:false}
      : {value:bulletin,source:provider,entity:config.weather_entity,fallback:!!id};
  };
  const temperature=read(config.temperature_entity,'temperature','temperature_unit','temperature');
  if(temperature.value!==undefined || config.temperature_entity) result.push({key:'temperature',title:'Température',icon:'mdi:thermometer',...temperature,unit:'°C',description:temperature.source==='Station locale'?'Mesurée chez vous':'Température du bulletin',detail:meaningfulComfort(hass,config,model)?`Ressenti ${new Intl.NumberFormat(hass.language || 'fr',{maximumFractionDigits:1}).format(finite(model.attributes.ressenti)!)} °C`:undefined});
  const wind=read(config.wind_speed_entity,'wind_speed','wind_speed_unit','wind');
  const gust=read(config.wind_gust_entity,'wind_gust_speed','wind_speed_unit','wind');
  if(wind.value!==undefined || gust.value!==undefined || config.wind_speed_entity || config.wind_gust_entity){
    const parts:string[]=[];
    if(gust.value!==undefined) parts.push(`Rafales ${new Intl.NumberFormat(hass.language || 'fr',{maximumFractionDigits:0}).format(gust.value)} km/h${gust.source!==wind.source ? ` · ${gust.source}`:''}`);
    const localBearing=local(config.wind_bearing_entity),bearing=localBearing??finite(w.wind_bearing);
    result.push({key:'wind',title:'Vent',icon:'mdi:weather-windy',...wind,bearing,bearingSource:localBearing!==undefined?'Station locale':provider,bearingEntity:localBearing!==undefined?config.wind_bearing_entity:config.weather_entity,gust,unit:'km/h',description:wind.source==='Station locale'?String(model.attributes.beaufort_tx || 'Mesuré chez vous'):'Vent du bulletin',detail:parts.join(' · ')});
  }
  const daily=local(config.daily_rain_entity,'rain'),rate=local(config.rain_rate_entity,'rain');
  if(daily!==undefined || rate!==undefined){
    result.push({key:'rain',title:'Pluie',icon:'mdi:weather-rainy',value:daily??rate,unit:daily!==undefined?'mm':'mm/h',source:'Station locale',entity:daily!==undefined?config.daily_rain_entity!:config.rain_rate_entity!,description:daily!==undefined?'Depuis minuit':'Intensité mesurée',detail:rate!==undefined ? rate===0?'Pas de pluie mesurée en ce moment':`${new Intl.NumberFormat(hass.language || 'fr',{maximumFractionDigits:1}).format(rate)} mm/h en ce moment`:'Intensité indisponible'});
  } else {
    const rainLabels:Record<string,string>={rainy:'Pluie',pouring:'Fortes pluies','lightning-rainy':'Pluie orageuse',snowy:'Neige','snowy-rainy':'Pluie et neige',hail:'Grêle',sunny:'Temps sec','clear-night':'Temps sec',partlycloudy:'Temps sec',cloudy:'Temps sec',fog:'Brouillard',windy:'Temps sec','windy-variant':'Temps sec',lightning:'Orage'};
    const label=available(weather)?rainLabels[weather!.state.replaceAll('_','-')]:undefined;
    const next=hourly.filter(p=>Number.isFinite(Date.parse(p.datetime)) && Date.parse(p.datetime)>=now.getTime() && Date.parse(p.datetime)<=now.getTime()+90*60_000).sort((a,b)=>Date.parse(a.datetime)-Date.parse(b.datetime))[0];
    const expected=finite(next?.precipitation);
    const hasBulletin=!!label || expected!==undefined;
    if(hasBulletin || config.daily_rain_entity || config.rain_rate_entity) result.push({key:'rain',title:'Pluie',icon:'mdi:weather-rainy',text:label,value:label?undefined:expected,unit:expected!==undefined && !label?'mm':'',source:hasBulletin ? expected!==undefined && !label?`${provider} · Prévision`:provider : 'Station locale',entity:hasBulletin?config.weather_entity:config.daily_rain_entity || config.rain_rate_entity || config.weather_entity,description:label?'État annoncé dans le bulletin':'Prochain créneau prévu',detail:expected!==undefined ? `${new Intl.NumberFormat(hass.language || 'fr',{maximumFractionDigits:1}).format(expected)} mm prévus sur le prochain créneau`:undefined,fallback:hasBulletin && !!(config.daily_rain_entity || config.rain_rate_entity)});
  }
  const pressure=read(config.pressure_entity,'pressure','pressure_unit','pressure');
  const baro=model.attributes.baro as {tx?:string;d?:number;f?:number}|undefined;
  if(pressure.value!==undefined || config.pressure_entity) result.push({key:'pressure',title:'Pression',icon:'mdi:gauge',...pressure,unit:'hPa',description:pressure.source==='Station locale'?baro?.tx || 'Mesurée chez vous':'Pression du bulletin',detail:pressure.source==='Station locale' ? finite(baro?.d)!==undefined ? `${baro!.d!>0?'+':''}${new Intl.NumberFormat(hass.language || 'fr',{maximumFractionDigits:1}).format(baro!.d!)} hPa sur ${baro!.f && baro!.f<150 ? `${baro!.f} min`:'3 h'}` : 'Tendance en cours de mesure' : undefined});
  // Temperature, wind, rain, pressure: keep a stable order as optional data comes and goes.
  const order=['temperature','wind','rain','pressure'];
  return result.sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key));
}
export function renderCurrentMetrics(metrics:CurrentMetric[],hass:HomeAssistant){
  const format=(value:number,key:CurrentMetric['key'])=>new Intl.NumberFormat(hass.language || 'fr',{maximumFractionDigits:key==='temperature'||key==='rain'?1:0}).format(value);
  return html`<div class="me-tuiles">${metrics.map(metric=>html`<div class="me-tu nw-current-metric" style="--tc:var(--mush-rgb-blue,61,155,233)" data-metric=${metric.key} data-entity=${metric.entity} role="button" tabindex="0" aria-label=${`${metric.title}, ${metric.source}`}>
    <span class="nw-metric-source" title=${metric.fallback?'Mesure locale indisponible : donnée du bulletin affichée à la place':metric.source}>${metric.source}${metric.fallback?' · repli':''}</span>
    <div class="nw-metric-body">${metric.key==='wind'?html`<svg class="me-rose" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17.2" class="me-rc"/><text x="20" y="7.4" text-anchor="middle" class="me-rn">N</text><circle cx="20" cy="20" r="1.7" class="me-rd"/>${metric.bearing===undefined?html``:html`<g class="me-aig" style=${`transform:rotate(${metric.bearing}deg)`}><path d="M20 6 L24 21 L20 18.5 L16 21 Z" class="me-aigp"/></g>`}</svg>`:html`<div class="me-tuic"><ha-icon icon=${metric.icon}></ha-icon></div>`}<div class="me-tut"><span class="nw-metric-name">${metric.title}</span>
      <span class="me-tuv">${metric.text ?? (metric.value===undefined?'—':format(metric.value,metric.key))}<i>${metric.unit}</i></span>
      <span class="me-tul">${metric.value===undefined && !metric.text?'Donnée indisponible':metric.description}</span>
      ${metric.detail?html`<span class="me-tus">${metric.detail}</span>`:html``}
    </div></div></div>`)}</div>`;
}

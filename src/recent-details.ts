import { css, html, nothing, svg } from 'lit';
import { finite, measurement, type History } from './local-model';
import type { HassEntity, HomeAssistant, WeatherCardConfig } from './types';
import type { CurrentMetric } from './current-measurements';

type Point = { t:number; v?:number };
export interface RainDay { date:string; label:string; value?:number; partial:boolean }
const valid=(entity?:HassEntity)=>!!entity&&!['unavailable','unknown'].includes(entity.state);
function points(rows:History[string]|undefined,unit:unknown,kind:string,now:number):Point[] {
  return (rows??[]).map(p=>({t:(p.lu??p.lc??0)*1000,v:measurement(p.s,unit,kind)}))
    .filter(p=>p.t>0&&p.t<=now).sort((a,b)=>a.t-b.t);
}
/** Daily sensor maxima, never differences of rolling 24h, weekly or monthly totals. */
export function rainDays(rows:History[string]|undefined,unit:unknown,now:Date,timeZone?:string):RainDay[] {
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  const series=points(rows,unit,'rain',now.getTime()).map(p=>({...p,date:formatter.format(new Date(p.t))}));
  const today=formatter.format(now), noon=new Date(`${today}T12:00:00Z`);
  const grouped=new Map<string,typeof series>();
  for(const p of series){const bucket=grouped.get(p.date)??[];bucket.push(p);grouped.set(p.date,bucket);}
  return Array.from({length:7},(_,i)=>{
    const date=new Date(noon);date.setUTCDate(noon.getUTCDate()-6+i);
    const key=date.toISOString().slice(0,10);
    const daily=grouped.get(key)??[];
    const previous=series.filter(p=>p.date<key).at(-1);
    const values=daily.map(p=>p.v).filter((v):v is number=>v!==undefined&&v>=0);
    const missing=daily.some(p=>p.v===undefined||p.v<0);
    // A zero that persists is a dry day; an old nonzero total must never be carried into a new day.
    const value=missing?undefined:values.length?Math.max(...values):previous?.v===0?0:undefined;
    const resetInside=daily.some((p,j)=>j>0&&p.v!==undefined&&daily[j-1].v!==undefined&&p.v<daily[j-1].v!);
    const partial=resetInside||(!previous&&daily.length>0);
    return {date:key,label:i===6?'Auj.':new Intl.DateTimeFormat('fr',{weekday:'short',timeZone:'UTC'}).format(date),value,partial};
  });
}
/** State-change history is drawn as steps; unavailable periods remain gaps. */
export function windPoints(rows:History[string]|undefined,unit:unknown,now:Date,current?:number):Point[] {
  const series=points(rows,unit,'wind',now.getTime()).map(p=>({...p,v:p.v!==undefined&&p.v<0?undefined:p.v})),start=now.getTime()-6*3600_000;
  if(!series.length)return [];
  const previous=series.filter(p=>p.t<=start).at(-1);
  const window=series.filter(p=>p.t>start);
  if(previous)window.unshift({...previous,t:start});
  window.push({t:now.getTime(),v:current});
  // Bound SVG size, keeping peaks and gaps in each three-minute bucket.
  const buckets=new Map<number,Point[]>();
  for(const p of window){const k=Math.floor((p.t-start)/180_000);const b=buckets.get(k)??[];b.push(p);buckets.set(k,b);}
  return [...buckets.values()].flatMap(b=>{
    if(b.some(p=>p.v===undefined))return [b[0],...b.filter(p=>p.v===undefined),b.at(-1)!];
    const peak=b.reduce((a,p)=>(p.v??0)>(a.v??0)?p:a);
    return [...new Set([b[0],peak,b.at(-1)!])].sort((a,c)=>a.t-c.t);
  });
}
export function windScale(current?:number,max?:number):number {return Math.max(80,Math.ceil(Math.max(current??0,max??0)/20)*20);}

/** Ten-minute time-weighted means or gust peaks; unknown intervals remain gaps. */
export function windChartSeries(rows:History[string]|undefined,unit:unknown,now:Date,current:number|undefined,mode:'mean'|'peak'):Point[] {
  return chartSeries(rows,unit,now,current,mode,'wind');
}
export function pressureChartSeries(rows:History[string]|undefined,unit:unknown,now:Date,current?:number):Point[] {
  return chartSeries(rows,unit,now,current,'mean','pressure');
}
function chartSeries(rows:History[string]|undefined,unit:unknown,now:Date,current:number|undefined,mode:'mean'|'peak',kind:'wind'|'pressure'):Point[] {
  const end=now.getTime(),start=end-6*3600_000,step=600_000;
  const events=points(rows,unit,kind,end).map(p=>({...p,v:p.v!==undefined&&p.v>=0?p.v:undefined}));
  if(!events.length)return [];
  const buckets=Array.from({length:36},()=>({sum:0,duration:0,peak:0,missing:false}));
  for(let i=0;i<events.length;i++){
    const a=Math.max(start,events[i].t),b=Math.min(end,events[i+1]?.t??end);
    if(b<=a)continue;
    for(let j=Math.max(0,Math.floor((a-start)/step));j<36&&start+j*step<b;j++){
      const duration=Math.min(b,start+(j+1)*step)-Math.max(a,start+j*step),bucket=buckets[j],v=events[i].v;
      if(v===undefined)bucket.missing=true;
      else {bucket.sum+=v*duration;bucket.duration+=duration;bucket.peak=Math.max(bucket.peak,v);}
    }
  }
  return [...buckets.map((b,i)=>({t:start+(i+.5)*step,v:!b.missing&&b.duration===step?(mode==='mean'?b.sum/b.duration:b.peak):undefined})),{t:end,v:current}];
}

/** Shape-preserving cubic curves: no overshoot, and never join across unavailable data. */
export function windCurvePaths(series:Point[],top:number,now:Date):Array<{line:string;area:string}> {
  const segments:Point[][]=[];let segment:Point[]=[];
  for(const p of series){if(p.v===undefined){if(segment.length>1)segments.push(segment);segment=[];}else segment.push(p);}
  if(segment.length>1)segments.push(segment);
  return segments.map(group=>{
    const coords=group.map(p=>({x:42+(p.t-(now.getTime()-6*3600_000))/21600_000*420,y:126-p.v!/top*96}));
    const slopes=coords.slice(1).map((p,i)=>(p.y-coords[i].y)/(p.x-coords[i].x));
    const tangents=coords.map((_,i)=>i===0?slopes[0]:i===coords.length-1?slopes.at(-1)!:slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]));
    slopes.forEach((s,i)=>{if(s===0){tangents[i]=0;tangents[i+1]=0;}else {const norm=Math.hypot(tangents[i]/s,tangents[i+1]/s);if(norm>3){tangents[i]*=3/norm;tangents[i+1]*=3/norm;}}});
    const f=(v:number)=>v.toFixed(2);
    let line=`M${f(coords[0].x)},${f(coords[0].y)}`;
    for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i],dx=(b.x-a.x)/3;line+=` C${f(a.x+dx)},${f(a.y+tangents[i-1]*dx)} ${f(b.x-dx)},${f(b.y-tangents[i]*dx)} ${f(b.x)},${f(b.y)}`;}
    return {line,area:`${line} L${f(coords.at(-1)!.x)},126 L${f(coords[0].x)},126 Z`};
  });
}

export function renderRecentDetails(hass:HomeAssistant,config:WeatherCardConfig,history:History,rainHistory:History,now:Date,metrics:CurrentMetric[]=[]){
  const read=(id:string|undefined,kind:string)=>{const e=hass.states[id??''];const v=valid(e)?measurement(e!.state,e!.attributes.unit_of_measurement,kind):undefined;return v!==undefined&&v>=0?v:undefined;};
  const fmt=(v:number|undefined,d=1)=>v===undefined?'—':new Intl.NumberFormat(hass.language||'fr',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
  const metric=(value:number|undefined,unit:string,label:string,id?:string,large=false)=>html`<button class=${`nw-history-value${large?' nw-history-value--large':''}`} data-entity=${id??config.weather_entity} aria-label=${`${label} : ${fmt(value)} ${unit}`}><strong>${fmt(value,unit==='km/h'||unit==='hPa'?0:1)}<small>${unit}</small></strong><span>${label}</span></button>`;
  const rainMetric=metrics.find(m=>m.key==='rain'),windMetric=metrics.find(m=>m.key==='wind'),pressureMetric=metrics.find(m=>m.key==='pressure');
  const hasRain=!!rainMetric||!!(config.rain_24h_entity||config.daily_rain_entity||config.weekly_rain_entity||config.monthly_rain_entity||config.yearly_rain_entity);
  const hasWind=!!windMetric||!!(config.wind_gust_entity||config.wind_speed_entity||config.max_daily_gust_entity);
  const hasPressure=!!pressureMetric||!!config.pressure_entity;
  if(!hasRain&&!hasWind&&!hasPressure)return nothing;
  const recentRain=read(config.rain_24h_entity,'rain'),todayRain=read(config.daily_rain_entity,'rain');
  const headlineRain=recentRain??todayRain,headlineRainId=recentRain!==undefined?config.rain_24h_entity:config.daily_rain_entity??config.rain_24h_entity;
  const rainLabel=recentRain!==undefined?'Ces dernières 24 h':todayRain!==undefined?'Depuis minuit':config.rain_24h_entity?'Ces dernières 24 h':'Depuis minuit';
  const dailyRows=rainHistory[config.daily_rain_entity??''];
  const days=rainDays(dailyRows?.length?[...dailyRows,{s:valid(hass.states[config.daily_rain_entity??''])?hass.states[config.daily_rain_entity!].state:'unavailable',lu:now.getTime()/1000}]:[],hass.states[config.daily_rain_entity??'']?.attributes.unit_of_measurement,now,hass.config?.time_zone);
  const rainChart=days.some(d=>d.value!==undefined);
  const rainTop=Math.max(2,Math.ceil(Math.max(...days.map(d=>d.value??0))/2)*2);
  const gustId=windMetric?.gust?.value!==undefined?windMetric.gust.entity:config.wind_gust_entity;
  const gust=windMetric?.gust?.value??read(config.wind_gust_entity,'wind');
  const windId=windMetric?.value!==undefined?windMetric.entity:config.wind_speed_entity||config.wind_gust_entity||windMetric?.entity;
  const isGustPrimary=!config.wind_speed_entity&&windMetric?.value===undefined&&!!config.wind_gust_entity,hasGust=!!gustId&&!isGustPrimary;
  const wind=windMetric?.value??read(windId,'wind'),windLabel=isGustPrimary?'Rafales maintenant':'Vent moyen maintenant';
  const windSource=windMetric&&windId===windMetric.entity?`${windMetric.source}${windMetric.fallback?' · repli':''}`:'Station locale';
  const maximum=read(config.max_daily_gust_entity,'wind'),scale=windScale(Math.max(wind??0,gust??0),maximum);
  const windUnit=hass.states[windId??'']?.attributes.unit_of_measurement;
  const series=windChartSeries(history[windId??''],windUnit,now,wind,isGustPrimary?'peak':'mean');
  const gustSeries=hasGust?windChartSeries(history[gustId],hass.states[gustId]?.attributes.unit_of_measurement,now,gust,'peak'):[];
  const windTop=Math.max(20,Math.ceil(Math.max(...[...series,...gustSeries].map(p=>p.v??0))/10)*10);
  const meanPaths=windCurvePaths(series,windTop,now),gustPaths=windCurvePaths(gustSeries,windTop,now);
  const windChart=meanPaths.length>0||gustPaths.length>0;
  const pressure=pressureMetric?.value??read(config.pressure_entity,'pressure'),pressureId=pressureMetric?.entity??config.pressure_entity;
  const pressureUnit=hass.states[pressureId??'']?.attributes.unit_of_measurement;
  const pressureSeries=pressureChartSeries(history[pressureId??''],pressureUnit,now,pressure);
  const pressureValues=pressureSeries.flatMap(p=>p.v===undefined?[]:[p.v]);
  const pressureLow=pressureValues.length?Math.floor(Math.min(...pressureValues))-1:0,pressureTop=pressureValues.length?Math.ceil(Math.max(...pressureValues))+1-pressureLow:2;
  const pressurePaths=windCurvePaths(pressureSeries.map(p=>({...p,v:p.v===undefined?undefined:p.v-pressureLow})),pressureTop,now);
  const chartGrid=(top:number,unit:string,bottom=0)=>svg`<text x="8" y="15">${unit}</text>${[0,.5,1].map(f=>svg`<line x1="42" x2="462" y1=${126-f*96} y2=${126-f*96}/><text x="32" y=${130-f*96} text-anchor="end">${fmt(bottom+top*f,0)}</text>`)}`;
  const timeLabels=()=>[0,2,4,6].map(h=>svg`<text x=${42+h/6*420} y="148" text-anchor="middle">${new Intl.DateTimeFormat('fr',{timeZone:hass.config?.time_zone,hour:'2-digit',minute:'2-digit'}).format(new Date(now.getTime()-(6-h)*3600_000))}</text>`);
  const measuredRain=headlineRain!==undefined;
  const bearing=windMetric?.bearing,compass=bearing===undefined?'Direction indisponible':['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'][Math.round(((bearing%360+360)%360)/22.5)%16];
  return html`<div class="nw-history-grid me-bilan" style=${`--history-columns:${Number(hasRain)+Number(hasWind)+Number(hasPressure)}`}>
    ${hasRain?html`<section class="nw-history-card me-bl" style="--history-accent:27,171,175" aria-label="Bilan pluie">
      <header><h3><ha-icon icon="mdi:weather-rainy"></ha-icon>Pluie</h3><span class="nw-history-source">${measuredRain?'Station locale':rainMetric?`${rainMetric.source}${rainMetric.fallback?' · repli':''}`:'Station locale'}</span></header>
      <div class="nw-history-headline">${measuredRain||!rainMetric?metric(headlineRain,'mm',rainLabel,headlineRainId,true):rainMetric.text?html`<button class="nw-history-value nw-history-value--condition" data-entity=${rainMetric.entity}><strong>${rainMetric.text}</strong><span>${rainMetric.description}</span></button>`:metric(rainMetric.value,rainMetric.unit,rainMetric.description,rainMetric.entity,true)}</div>
      <div class="nw-rain-counters">${config.weekly_rain_entity?metric(read(config.weekly_rain_entity,'rain'),'mm','Cette semaine',config.weekly_rain_entity):nothing}${config.monthly_rain_entity?metric(read(config.monthly_rain_entity,'rain'),'mm','Ce mois',config.monthly_rain_entity):nothing}${config.yearly_rain_entity?metric(read(config.yearly_rain_entity,'rain'),'mm','Cette année',config.yearly_rain_entity):nothing}</div>
      <details class="nw-statistics"><summary>Statistiques</summary><div class="nw-history-chart"><h4>Pluie des 7 derniers jours</h4>${rainChart?svg`<svg viewBox="0 0 480 156" role="img" aria-label="Maxima journaliers du compteur de pluie ; un tiret indique une donnée absente">${chartGrid(rainTop,'mm')}${days.map((d,i)=>{
        const x=60+i*60,h=(d.value??0)/rainTop*96;
        return svg`<g><title>${d.date} : ${d.value===undefined?'indisponible':`${d.partial?'au moins ':''}${fmt(d.value)} mm`}</title>${d.value!==undefined&&d.value>0?svg`<rect x=${x} y=${126-h} width="24" height=${h} rx="3"/>`:nothing}<text x=${x+12} y=${d.value===undefined?112:Math.max(24,120-h)} text-anchor="middle">${d.value===undefined?'—':d.value===0?'':`${d.partial?'≥ ':''}${fmt(d.value)}`}</text><text x=${x+12} y="148" text-anchor="middle">${d.label}</text></g>`;
      })}</svg>`:html`<p class="nw-history-empty">${config.daily_rain_entity?'Historique de pluie indisponible':'Ajoutez le cumul depuis minuit pour afficher l’historique.'}</p>`}
      ${rainChart?html`<p class="nw-history-caption">Maxima enregistrés · aujourd’hui en cours${days.some(d=>d.partial)?' · ≥ historique partiel':''}</p>`:nothing}</div></details>
    </section>`:nothing}
    ${hasWind?html`<section class="nw-history-card me-bl" style="--history-accent:40,130,240" aria-label="Bilan vent">
      <header><h3><ha-icon icon="mdi:weather-windy"></ha-icon>Vent</h3><span class="nw-history-source">${windSource}</span></header>
      <div class="nw-history-headline nw-wind-headline">${metric(wind,'km/h',windLabel,windId,true)}${hasGust?metric(gust,'km/h',`Rafales maintenant${windMetric?.gust?.source&&windMetric.gust.source!==windMetric.source?' · '+windMetric.gust.source:''}`,gustId):nothing}
      ${bearing!==undefined||config.wind_bearing_entity?html`<button class="nw-wind-direction" data-entity=${windMetric?.bearingEntity??config.wind_bearing_entity??config.weather_entity} aria-label=${`Direction du vent : ${compass}, ${windMetric?.bearingSource??'Station locale'}`}><svg class="me-rose" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17.2" class="me-rc"/><text x="20" y="7.4" text-anchor="middle" class="me-rn">N</text><circle cx="20" cy="20" r="1.7" class="me-rd"/>${bearing===undefined?nothing:svg`<g class="me-aig" style=${`transform:rotate(${bearing}deg)`}><path d="M20 6 L24 21 L20 18.5 L16 21 Z" class="me-aigp"/></g>`}</svg><span>${compass}${bearing===undefined?'':` · ${fmt((bearing%360+360)%360,0)}°`}${windMetric?.bearingSource&&windMetric.bearingSource!==windMetric.source?html`<small>${windMetric.bearingSource}</small>`:nothing}</span></button>`:nothing}
      </div><details class="nw-statistics"><summary>Statistiques</summary>
      ${config.max_daily_gust_entity?metric(maximum,'km/h',`Rafale max. du jour${windSource==='Station locale'?'':' · station'}`,config.max_daily_gust_entity):nothing}
      <div class="nw-wind-scale" aria-label=${`Échelle de 0 à ${scale} kilomètres par heure`}><div class="nw-wind-axis">${[0,.25,.5,.75,1].map(f=>html`<span style=${`left:${f*100}%`}>${fmt(scale*f,0)}${f===1?' km/h':''}</span>`)}${wind===undefined?nothing:html`<i class="nw-wind-marker" style=${`left:${wind/scale*100}%`} title=${`${windLabel} : ${fmt(wind,0)} km/h`}></i>`}${maximum===undefined?nothing:html`<i class="nw-wind-marker nw-wind-marker--max" style=${`left:${maximum/scale*100}%`} title=${`Maximum du jour : ${fmt(maximum,0)} km/h`}></i>`}</div><div class="nw-wind-legend"><span>● ${isGustPrimary?'Rafales actuelles':'Vent moyen actuel'}</span>${maximum===undefined?nothing:html`<span>│ Rafale max. du jour</span>`}</div></div>
      <div class="nw-history-chart"><h4>Vent des 6 dernières heures</h4>${windChart?svg`<svg viewBox="0 0 480 156" role="img" aria-label="Vent moyen et rafales regroupés par dix minutes ; les données indisponibles restent des coupures"><defs><linearGradient id="nw-wind-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(40,130,240)" stop-opacity=".18"/><stop offset="100%" stop-color="rgb(40,130,240)" stop-opacity=".015"/></linearGradient></defs>${chartGrid(windTop,'km/h')}${meanPaths.map(d=>svg`<path class="nw-history-area" d=${d.area} fill="url(#nw-wind-area)"/><path class="nw-wind-curve" d=${d.line} fill="none"/>`)}${gustPaths.map(d=>svg`<path class="nw-wind-curve nw-wind-curve--gust" d=${d.line} fill="none"/>`)}${[0,2,4,6].map(h=>svg`<text x=${42+h/6*420} y="148" text-anchor="middle">${new Intl.DateTimeFormat('fr',{timeZone:hass.config?.time_zone,hour:'2-digit',minute:'2-digit'}).format(new Date(now.getTime()-(6-h)*3600_000))}</text>`)}</svg>`:html`<p class="nw-history-empty">Historique du vent indisponible ou insuffisant</p>`}
      ${windChart?html`<div class="nw-wind-chart-legend">${meanPaths.length?html`<span>${isGustPrimary?'Rafales · pics 10 min':'Vent moyen · moyenne 10 min'}</span>`:nothing}${gustPaths.length?html`<span class="nw-wind-chart-legend--gust">Rafales · pics 10 min</span>`:nothing}</div>`:nothing}</div></details>
    </section>`:nothing}
    ${hasPressure?html`<section class="nw-history-card me-bl" style="--history-accent:135,117,190" aria-label="Bilan pression"><header><h3><ha-icon icon="mdi:gauge"></ha-icon>Pression</h3><span class="nw-history-source">${pressureMetric?`${pressureMetric.source}${pressureMetric.fallback?' · repli':''}`:'Station locale'}</span></header>
      <div class="nw-history-headline">${metric(pressure,'hPa','Pression actuelle',pressureId,true)}</div>
      <details class="nw-statistics"><summary>Statistiques</summary><div class="nw-history-chart"><h4>Pression des 6 dernières heures</h4>${pressurePaths.length?svg`<svg viewBox="0 0 480 156" role="img" aria-label="Historique de pression mesurée, en hectopascals ; les données absentes restent des coupures"><defs><linearGradient id="nw-pressure-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(135,117,190)" stop-opacity=".18"/><stop offset="100%" stop-color="rgb(135,117,190)" stop-opacity=".015"/></linearGradient></defs>${chartGrid(pressureTop,'hPa',pressureLow)}${pressurePaths.map(d=>svg`<path class="nw-history-area" d=${d.area} fill="url(#nw-pressure-area)"/><path class="nw-wind-curve" d=${d.line} fill="none"/>`)}${timeLabels()}</svg>`:html`<p class="nw-history-empty">Historique de pression indisponible ou insuffisant</p>`}<p class="nw-history-caption">Moyennes 10 min · échelle ajustée à la période</p></div></details>
    </section>`:nothing}
  </div>`;
}

export const recentDetailsStyles=css`
  .nw-history-grid.me-bilan { display:grid;grid-template-columns:repeat(var(--history-columns,3),minmax(0,1fr));gap:16px;padding:0;border:0;align-items:stretch; }
  .nw-history-card.me-bl { min-width:0;display:flex;flex-direction:column;padding:20px;border:1px solid var(--divider-color,rgba(150,150,150,.2));border-radius:16px;background:rgba(150,150,150,.035); }
  .nw-history-card:only-child { grid-column:1 / -1; }
  .nw-statistics { margin-top:auto;padding-top:12px; }
  .nw-statistics:not([open])>.nw-history-value { display:none; }
  .nw-statistics>summary { cursor:pointer;font-size:11px;font-weight:600;color:var(--secondary-text-color);padding:8px 0; }
  .nw-statistics:not([open])>.nw-history-chart, .nw-statistics:not([open])>.nw-wind-scale { display:none; }
  .nw-history-value--condition strong { font-size:26px; }
  .nw-wind-direction { --tc:40,130,240;display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:transparent;color:var(--secondary-text-color);font:inherit;font-size:11px;text-align:center;padding:0;cursor:pointer; }
  .nw-wind-direction .me-rose { width:38px;height:38px;flex:0 0 38px;animation:none; }
  .nw-wind-direction .me-aig { transform-box:view-box;transform-origin:50% 50%; }
  .nw-wind-direction small { display:block;font-size:10px;margin-top:3px; }
  .nw-history-card .nw-history-source { white-space:normal;text-align:right; }
  .nw-history-card header { display:flex;align-items:center;justify-content:space-between;gap:8px; }
  .nw-history-card h3 { display:flex;align-items:center;gap:9px;margin:0;font-size:18px;color:var(--primary-text-color); }
  .nw-history-card h3 ha-icon { color:rgb(var(--history-accent));--mdc-icon-size:24px; }
  .nw-history-source { border:1px solid var(--divider-color,rgba(150,150,150,.2));border-radius:999px;padding:4px 8px;font-size:10px;color:var(--secondary-text-color);white-space:nowrap; }
  .nw-history-headline { margin:16px 0 12px;min-height:60px; }
  .nw-history-value { display:flex;flex-direction:column;align-items:flex-start;text-align:left;font:inherit;border:0;background:transparent;padding:0;color:var(--primary-text-color);cursor:pointer;min-width:0; }
  .nw-history-value strong { font-size:21px;letter-spacing:-.6px;line-height:1.2; }
  .nw-history-value small { font-size:11px;font-weight:500;margin-left:4px;letter-spacing:0;color:var(--secondary-text-color); }
  .nw-history-value span { font-size:11px;color:var(--secondary-text-color);margin-top:5px;line-height:1.4; }
  .nw-history-value--large strong { font-size:40px;letter-spacing:-1.2px; }
  .nw-history-value--large small { font-size:17px; }
  .nw-rain-counters { display:flex;gap:12px;align-items:flex-start; }
  .nw-rain-counters:empty { display:none; }
  .nw-rain-counters .nw-history-value { flex:1;flex-direction:column-reverse;gap:7px; }
  .nw-rain-counters .nw-history-value+.nw-history-value { border-left:1px solid var(--divider-color,rgba(150,150,150,.2));padding-left:12px; }
  .nw-wind-headline { display:flex;justify-content:space-between;gap:12px;align-items:center; }
  .nw-wind-headline>.nw-history-value+.nw-history-value { border-left:1px solid var(--divider-color,rgba(150,150,150,.2));padding-left:16px; }
  .nw-wind-headline>.nw-history-value+.nw-history-value strong { font-size:24px; }
  .nw-wind-scale { padding:10px 24px 0 8px;min-height:58px; }
  .nw-wind-axis { position:relative;height:1px;background:var(--divider-color,#aaa);margin-top:8px; }
  .nw-wind-axis>span { position:absolute;top:9px;transform:translateX(-50%);font-size:10px;white-space:nowrap!important;color:var(--secondary-text-color); }
  .nw-wind-axis>span::before { content:'';position:absolute;top:-9px;left:50%;height:4px;width:1px;background:var(--divider-color,#aaa); }
  .nw-wind-marker { position:absolute;top:-6px;height:13px;width:3px;border-radius:2px;background:rgb(var(--history-accent)); }
  .nw-wind-marker--max { background:var(--primary-text-color); }
  .nw-wind-legend { display:flex;gap:16px;flex-wrap:wrap;padding-top:27px;font-size:10px;color:rgb(var(--history-accent)); }
  .nw-wind-legend span+span { color:var(--primary-text-color); }
  .nw-history-chart { border-top:1px solid var(--divider-color,rgba(150,150,150,.2));margin-top:12px;padding-top:14px;flex:1; }
  .nw-history-chart h4 { font-size:12px;margin:0 0 8px;color:var(--primary-text-color); }
  .nw-history-chart svg { display:block;width:100%;height:auto;overflow:visible; }
  .nw-history-chart svg text { font:10px Roboto,Arial,sans-serif;fill:var(--secondary-text-color); }
  .nw-history-chart svg line { stroke:var(--divider-color,rgba(150,150,150,.2));stroke-dasharray:3 4; }
  .nw-history-chart svg rect { fill:rgb(var(--history-accent));opacity:.85; }
  .nw-history-chart svg path { stroke:rgb(var(--history-accent));stroke-width:2.5;stroke-linejoin:round; }
  .nw-history-chart svg path.nw-history-area { stroke:none; }
  .nw-history-chart svg path.nw-wind-curve { stroke-width:1.8;vector-effect:non-scaling-stroke;stroke-linecap:round; }
  .nw-history-chart svg path.nw-wind-curve--gust { stroke:rgb(103,167,243);stroke-width:1.3;stroke-dasharray:4 4; }
  .nw-wind-chart-legend { display:flex;flex-wrap:wrap;gap:8px 16px;font-size:10px;color:var(--secondary-text-color);margin-top:8px; }
  .nw-wind-chart-legend span::before { content:'';display:inline-block;width:16px;border-top:2px solid rgb(40,130,240);margin-right:6px;vertical-align:middle; }
  .nw-wind-chart-legend .nw-wind-chart-legend--gust::before { border-top:2px dashed rgb(103,167,243); }
  .nw-history-caption { font-size:10px;color:var(--secondary-text-color);margin:5px 0; }
  .nw-history-empty { display:flex;align-items:center;justify-content:center;min-height:45px;font-size:12px;text-align:center;color:var(--secondary-text-color); }
  @container(max-width:1050px) { .nw-history-grid.me-bilan { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @container(max-width:650px) { .nw-history-grid.me-bilan { grid-template-columns:1fr; }.nw-history-card.me-bl { padding:16px; }.nw-history-value strong { font-size:18px; }.nw-history-value--large strong { font-size:34px; }.nw-rain-counters { gap:8px; }.nw-rain-counters .nw-history-value+.nw-history-value { padding-left:8px; }.nw-history-chart svg text { font-size:16px; } }
`;

import {finite,measurement,type History} from './local-model';
import type {HomeAssistant,WeatherCardConfig} from './types';
import { dateFormat } from './intl-cache';
export interface Total {value?:number;partial:boolean}
export interface Statistic {start:number;end:number;sum?:number;state?:number;partial?:boolean}
export interface StationArchive {rain:Statistic[];rainUnit?:string;counter:History;}
export interface StationDerived {rain:Record<'day'|'recent'|'week'|'month'|'year',Total>;days:Array<{date:string;label:string;value?:number;partial:boolean}>;temperatureTrend?:number;gustMax?:Total;}
const round=(n:number)=>Math.round(n*100)/100;
export function counterIncrease(rows:Array<{t:number;v?:number}>,start:number,end:number):Total {
  const points=rows.filter(p=>p.t<=end).sort((a,b)=>a.t-b.t);
  const prior=points.filter(p=>p.t<=start).at(-1);
  const first=prior?.v!==undefined?prior:points.find(p=>p.t>=start&&p.v!==undefined);
  if(!first)return {partial:true};
  let previous=first.v!,value=0,partial=!prior||prior.v===undefined;
  const window=points.filter(p=>p.t>first.t&&p.t<=end);
  if(!window.length&&(!prior||first.t<end))return {partial:true};
  for(const p of window){
    if(p.v===undefined||p.v<0){partial=true;continue;}
    if(p.v<previous&&p.v>previous*.9){partial=true;continue;} // Small drops are not evidence of a reset.
    value+=p.v>=previous?p.v-previous:p.v;previous=p.v;
  }
  return {value:round(value),partial:partial||(points.at(-1)?.t??0)<end};
}
export function statisticIncrease(rows:Statistic[],start:number,end:number):Total {
  const valid=rows.filter(p=>p.end<=end&&finite(p.sum)!==undefined).sort((a,b)=>a.end-b.end);
  // No interpolation of rainfall inside an aggregate: start at the next known
  // boundary instead of including rain that may predate the requested period.
  const prior=valid.find(p=>p.end===start),first=prior??valid.find(p=>p.end>start),last=valid.at(-1);
  if(!first||!last||first===last&&(!prior||last.end<end))return {partial:true};
  const relevant=valid.filter(p=>p.end>first.end);
  let partial=!prior||first.end!==start||last.end<end,previous=first,value=0;
  for(const p of relevant){if(p.start>previous.end||p.sum!<previous.sum!||p.partial)partial=true;value+=Math.max(0,p.sum!-previous.sum!);previous=p;}
  return {value:round(value),partial};
}
function calendarParts(date:Date,timeZone:string){return Object.fromEntries(dateFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));}
export function calendarMidnight(year:number,month:number,day:number,timeZone:string):number {
  const desired=Date.UTC(year,month-1,day),normalized=new Date(desired);
  let guess=desired;
  for(let i=0;i<4;i++){const p=calendarParts(new Date(guess),timeZone);const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);guess+=desired-local;}
  return Number.isFinite(normalized.getTime())?guess:NaN;
}
export function periodStarts(now:Date,timeZone='UTC') {
  const p=calendarParts(now,timeZone),y=+p.year,m=+p.month,d=+p.day;
  const weekday=(new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7;
  return {day:calendarMidnight(y,m,d,timeZone),week:calendarMidnight(y,m,d-weekday,timeZone),month:calendarMidnight(y,m,1,timeZone),year:calendarMidnight(y,1,1,timeZone)};
}
export function deriveStation(hass:HomeAssistant,config:WeatherCardConfig,archive:StationArchive,history:History,now:Date):StationDerived {
  const timeZone=hass.config?.time_zone??'UTC',end=now.getTime(),starts=periodStarts(now,timeZone),id=config.rain_total_entity??'',e=hass.states[id];
  const counter=(archive.counter[id]??[]).map(p=>({t:(p.lu??p.lc??0)*1000,v:measurement(p.s,e?.attributes.unit_of_measurement,'rain')}));
  const live=measurement(e?.state,e?.attributes.unit_of_measurement,'rain');
  if(live!==undefined)counter.push({t:end,v:live});
  // HA reduces the current day/month into a row ending in the future; only completed boundaries are usable.
  const stats=archive.rain.filter(p=>p.end<=end).map(p=>({...p,sum:measurement(p.sum,archive.rainUnit,'rain'),state:measurement(p.state,archive.rainUnit,'rain')})).sort((a,b)=>a.end-b.end);
  const last=stats.at(-1);
  if(last&&live!==undefined&&last.state!==undefined&&last.sum!==undefined&&last.end<end){
    const tail=counterIncrease([{t:last.end,v:last.state},...counter.filter(p=>p.t>last.end)],last.end,end);
    if(tail.value!==undefined)stats.push({start:last.end,end,sum:last.sum+tail.value,state:live,partial:tail.partial});
  }
  const total=(start:number)=>{
    const recent=counterIncrease(counter,start,end);
    const recorded=statisticIncrease(stats,start,end);
    return recent.value!==undefined&&!recent.partial?recent:recorded.value!==undefined?recorded:recent;
  };
  const today=dateFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const [y,m,d]=today.split('-').map(Number);
  const days=Array.from({length:7},(_,i)=>{
    const date=new Date(Date.UTC(y,m-1,d-6+i)),dateKey=date.toISOString().slice(0,10);
    const start=calendarMidnight(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),timeZone);
    const stop=Math.min(end,calendarMidnight(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate()+1,timeZone));
    const recent=counterIncrease(counter,start,stop),recorded=statisticIncrease(stats,start,stop),value=recent.value!==undefined&&!recent.partial?recent:recorded.value!==undefined?recorded:recent;
    return {date:dateKey,label:i===6?'Auj.':dateFormat('fr',{weekday:'short',timeZone:'UTC'}).format(date),...value};
  });
  let temperatureTrend:number|undefined;
  if(!config.temperature_trend_entity&&config.temperature_entity){
    const entity=hass.states[config.temperature_entity],rows=history[config.temperature_entity]??[];
    const all=rows.map(p=>({t:(p.lu??p.lc??0)*1000,v:measurement(p.s,entity?.attributes.unit_of_measurement,'temperature')})).filter(p=>p.t<=end).sort((a,b)=>a.t-b.t);
    const boundary=all.filter(p=>p.t<=end-3600_000).at(-1),points=all.filter(p=>p.t>end-3600_000);
    if(boundary)points.unshift({...boundary,t:end-3600_000});
    const first=points.find(p=>p.v!==undefined),current=measurement(entity?.state,entity?.attributes.unit_of_measurement,'temperature');
    if(first&&current!==undefined&&end-first.t>=1800_000&&!points.some(p=>p.v===undefined))temperatureTrend=round((current-first.v!)*3600_000/(end-first.t));
  }
  let gustMax:Total|undefined;
  if(!config.max_daily_gust_entity&&config.wind_gust_entity){
    const entity=hass.states[config.wind_gust_entity],rows=history[config.wind_gust_entity]??[];
    const all=rows.map(p=>({t:(p.lu??p.lc??0)*1000,v:measurement(p.s,entity?.attributes.unit_of_measurement,'wind')})).sort((a,b)=>a.t-b.t);
    const prior=all.filter(p=>p.t<=starts.day).at(-1),points=all.filter(p=>p.t>=starts.day&&p.t<=end);
    const values=[prior?.v,...points.map(p=>p.v),measurement(entity?.state,entity?.attributes.unit_of_measurement,'wind')].filter((v):v is number=>v!==undefined&&v>=0);
    if(points.length&&values.length)gustMax={value:Math.max(...values),partial:!prior||points.some(p=>p.v===undefined)};
  }
  return {rain:{day:total(starts.day),recent:total(end-86400_000),week:total(starts.week),month:total(starts.month),year:total(starts.year)},days,temperatureTrend,gustMax};
}

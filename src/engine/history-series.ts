import { finite, measurement, type History } from './local-model';
import type { HassEntity } from '../types';
import { dateFormat } from '../intl-cache';

type Point = { t:number; v?:number };
export interface RainDay { date:string; label:string; value?:number; partial:boolean }
const valid=(entity?:HassEntity)=>!!entity&&!['unavailable','unknown'].includes(entity.state);
function points(rows:History[string]|undefined,unit:unknown,kind:string,now:number):Point[] {
  return (rows??[]).map(p=>({t:(p.lu??p.lc??0)*1000,v:measurement(p.s,unit,kind)}))
    .filter(p=>p.t>0&&p.t<=now).sort((a,b)=>a.t-b.t);
}
/** Daily sensor maxima, never differences of rolling 24h, weekly or monthly totals. */
export function rainDays(rows:History[string]|undefined,unit:unknown,now:Date,timeZone?:string):RainDay[] {
  const formatter=dateFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
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
    // A daily counter keeps accumulating through a short outage (e.g. `unknown` at the midnight reset),
    // so readings after it still give the right maximum. Only an outage still running at the end of the day can hide rain.
    const last=daily.at(-1),endsInOutage=!!last&&(last.v===undefined||last.v<0);
    // A zero that persists is a dry day; an old nonzero total must never be carried into a new day.
    const highest=values.length?Math.max(...values):!daily.length&&previous?.v===0?0:undefined;
    // "At least 0 mm" says nothing: a dry reading followed by an unfinished outage stays unknown.
    const value=endsInOutage&&highest===0?undefined:highest;
    const resetInside=values.some((v,j)=>j>0&&v<values[j-1]);
    const partial=value!==undefined&&(resetInside||endsInOutage||(!previous&&daily.length>0));
    return {date:key,label:i===6?'Auj.':dateFormat('fr',{weekday:'short',timeZone:'UTC'}).format(date),value,partial};
  });
}

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

/** Height of the small history charts' drawing box; the width is always 100 (six hours). */
export const CHART_HEIGHT=50;
/** Shape-preserving cubic curves in a 100 × 50 box: no overshoot, and never join across unavailable data. */
export function curvePaths(series:Point[],top:number,now:Date,bottom=0):Array<{line:string;area:string}> {
  const segments:Point[][]=[];let segment:Point[]=[];
  for(const p of series){if(p.v===undefined){if(segment.length>1)segments.push(segment);segment=[];}else segment.push(p);}
  if(segment.length>1)segments.push(segment);
  return segments.map(group=>{
    const coords=group.map(p=>({x:(p.t-(now.getTime()-6*3600_000))/21600_000*100,y:chartY(p.v!,top,bottom)}));
    const slopes=coords.slice(1).map((p,i)=>(p.y-coords[i].y)/(p.x-coords[i].x));
    const tangents=coords.map((_,i)=>i===0?slopes[0]:i===coords.length-1?slopes.at(-1)!:slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]));
    slopes.forEach((s,i)=>{if(s===0){tangents[i]=0;tangents[i+1]=0;}else {const norm=Math.hypot(tangents[i]/s,tangents[i+1]/s);if(norm>3){tangents[i]*=3/norm;tangents[i+1]*=3/norm;}}});
    const f=(v:number)=>v.toFixed(2);
    let line=`M${f(coords[0].x)},${f(coords[0].y)}`;
    for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i],dx=(b.x-a.x)/3;line+=` C${f(a.x+dx)},${f(a.y+tangents[i-1]*dx)} ${f(b.x-dx)},${f(b.y-tangents[i]*dx)} ${f(b.x)},${f(b.y)}`;}
    return {line,area:`${line} L${f(coords.at(-1)!.x)},${CHART_HEIGHT} L${f(coords[0].x)},${CHART_HEIGHT} Z`};
  });
}
/** Vertical position of a value in the 100 × 50 box, with room above for the value pills. */
export function chartY(value:number,top:number,bottom=0):number { return CHART_HEIGHT-2-(value-bottom)/Math.max(1e-6,top-bottom)*(CHART_HEIGHT-6); }

/** One-word reminders of what is happening now, echoing the synthesis in the matching column. */
export function columnStatus(model?:HassEntity):{rain?:string;wind?:string;pressure?:string} {
  const a=model?.attributes??{},rate=finite(a.pluie_taux);
  const wind=a.vent_t as {d?:number}|undefined,windChange=finite(wind?.d)!==undefined&&wind!.d!==-999?wind!.d!:undefined;
  const pressure=(a.baro as {s?:string}|undefined)?.s;
  return {
    rain:rate===undefined||rate<.3?undefined:rate>=4?'Forte pluie en cours':'Pluie en cours',
    // Over one hour: a few km/h is noise, 8 km/h is felt.
    wind:windChange===undefined?undefined:windChange>=8?'Le vent s’intensifie':windChange<=-8?'Le vent faiblit':undefined,
    pressure:pressure==='baisse'?'La pression baisse':pressure==='hausse'?'La pression monte':undefined,
  };
}


import { css, html, LitElement, nothing, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/** Bolt artwork and phase offset in the 6 s storm cycle. Offsets keep successive strikes ≥ 1.8 s apart. */
const BOLTS=[
  {d:'M58 0 43 40 61 52 35 88 49 97 24 144 37 151 12 217M43 40 23 56 34 67 17 91M35 88 72 107 64 121 88 147',delay:0},
  {d:'M42 0 62 35 48 52 81 87 67 102 92 153 80 171 104 216M62 35 85 40 81 58 105 80',delay:-2.1},
  {d:'M70 0 52 30 66 44 40 78 58 86 30 130 44 136 26 190M52 30 34 42 40 56M40 78 18 96',delay:-4.2},
];

/** Original vector/CSS weather scene. All artwork is bundled; no remote assets. */
@customElement('niak-weather-sky')
export class NiakWeatherSky extends LitElement {
  @property() condition='unknown';
  @property() phase='unknown';
  @property() quality:'low'|'standard'='standard';
  @property({type:Boolean}) animated=true;
  @property({type:Number}) wind=0;
  /** spring | summer | autumn | winter: small seasonal touches that never contradict the weather. */
  @property() season='';
  @state() private visible=false;
  @state() private pageVisible=true;
  private observer?:IntersectionObserver;
  private visibility=()=>{this.pageVisible=!document.hidden;};
  connectedCallback() {
    super.connectedCallback();this.visibility();document.addEventListener('visibilitychange',this.visibility);
    if(typeof IntersectionObserver!=='undefined') {
      this.observer=new IntersectionObserver(entries=>{this.visible=entries.some(e=>e.isIntersecting);});this.observer.observe(this);
    } else this.visible=true;
  }
  disconnectedCallback() {super.disconnectedCallback();this.observer?.disconnect();document.removeEventListener('visibilitychange',this.visibility);}
  private cloud(layer:string) {
    return html`<svg class=${`cloud ${layer}`} viewBox="0 0 180 112" aria-hidden="true">
      <path class="cloud-rear" d="M42 103C21 103 7 90 7 70C7 53 17 40 33 36C35 16 50 5 69 5C91 5 107 19 109 40C116 37 123 36 130 36C154 36 172 51 172 73C172 92 157 103 137 103Z"/>
      <path class="cloud-near" d="M38 103C26 103 19 95 19 84C19 73 27 65 36 64C38 52 47 45 59 45C72 45 82 54 83 65C99 62 116 72 116 85C116 96 108 103 94 103Z"/>
    </svg>`;
  }
  /** Deterministic star field over the artwork side; each star twinkles on its own rhythm. */
  private stars(count:number) {
    return Array.from({length:count},(_,i)=>{
      const duration=2.2+(i*7%10)*.26;
      return html`<i class=${`star${i%6===0?' bright':''}`} style=${`--sx:${48+(i*37)%50}%;--sy:${4+(i*53)%62}%;--ss:${1.2+(i%4)*.5}px;--st:${duration}s;--sd:${-((i*.73)%duration)}s`}></i>`;
    });
  }
  /** Fog: drifting bands of mist at several depths, instead of clouds. */
  private fog() {
    const bands=this.quality==='low'?3:5;
    return html`${this.phase==='day'||this.phase==='twilight'?html`<div class="fog-sun"></div>`:nothing}
      ${Array.from({length:bands},(_,i)=>html`<svg class=${`fog-band depth-${i%3}`} viewBox="0 0 600 60" preserveAspectRatio="none" style=${`--fy:${6+i*16}%;--fl:${[-10,18,-25,30,0][i]}%;--fw:${[120,95,140,85,130][i]}%;--fd:${13+i*3}s;--fdelay:${-i*2.7}s;--dir:${i%2?-1:1}`}><path d="M0 34C60 16 130 20 190 30S330 48 400 32 520 14 600 28V60H0Z"/></svg>`)}`;
  }
  /** Frost forming on a window pane in the top-right corner, then melting: a frosty film spreads from the corner while ice ferns draw themselves. */
  private frostPane() {
    const ferns:string[]=[];
    [[118,150],[132,120],[146,95],[160,140],[172,70],[186,110],[200,60],[214,85]].forEach(([deg,len],k)=>{
      const a=deg*Math.PI/180,x0=260,y0=0,ex=x0+Math.cos(a)*len,ey=y0+Math.sin(a)*len;
      let d=`M${x0} ${y0}L${ex.toFixed(1)} ${ey.toFixed(1)}`;
      for(let t=14;t<len-6;t+=11+(k%3)*2){
        const px=x0+Math.cos(a)*t,py=y0+Math.sin(a)*t,twig=(len-t)*.28;
        for(const side of [-1,1]){const b=a+side*.75;d+=`M${px.toFixed(1)} ${py.toFixed(1)}l${(Math.cos(b)*twig).toFixed(1)} ${(Math.sin(b)*twig).toFixed(1)}`;}
      }
      ferns.push(d);
    });
    return html`<svg class="frost-pane" viewBox="0 0 260 160" preserveAspectRatio="xMaxYMin meet" aria-hidden="true">
      <defs>
        <filter id="nw-frost-texture" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.8 0 0 0 -.62"/></filter>
      </defs>
      <g>
        <g class="frost-film"><rect class="frost-veil" width="260" height="160"/>
        <rect width="260" height="160" filter="url(#nw-frost-texture)" opacity=".6"/></g>
        ${ferns.map((d,k)=>svg`<path class="frost-fern" pathLength="1" style=${`--fk:${k*.35}s`} d=${d}/>`)}
      </g>
    </svg>`;
  }
  /** Seasonal touches, layered over the weather: petals, rising heat, falling leaves, frosting pane. */
  private seasonal(precip:boolean,storm:boolean,fog:boolean) {
    const few=this.quality==='low';
    const drift=(count:number,art:(i:number)=>unknown)=>Array.from({length:few?2:count},(_,i)=>html`<div class="drift" style=${`--dx:${46+(i*23)%50}%;--dt:${11+(i*7)%7}s;--dd:${-(i*3.1)%11}s;--rest:${12+(i*29)%70}%;--sw:${2.6+(i%3)*.5}s`}><i>${art(i)}</i></div>`);
    if(this.season==='spring'&&!precip&&!storm&&!fog) return drift(6,i=>html`<svg class=${`petal petal-${i%2}`} viewBox="0 0 12 12"><path d="M6 0C10 3 10 9 6 12C2 9 2 3 6 0Z"/></svg>`);
    if(this.season==='autumn'&&!storm&&!['snowy','snowy-rainy','hail'].includes(this.condition)) return drift(5,i=>html`<svg class=${`maple maple-${i%3}`} viewBox="0 0 24 24"><path d="M12 1l2 5 4-2-1 5 4 1-4 3 2 4-5-1-1 7h-2l-1-7-5 1 2-4-4-3 4-1-1-5 4 2z"/></svg>`);
    if(this.season==='summer'&&this.phase==='day'&&['sunny','partlycloudy'].includes(this.condition)) return html`<div class="heat">${Array.from({length:few?3:7},(_,i)=>html`<svg class="heat-plume" viewBox="0 0 24 120" preserveAspectRatio="none" style=${`--hx:${47+(i*13)%46}%;--hh:${70+(i*17)%45}px;--hd:${-(i*.9)%4.2}s;--hs:${1.6+(i%3)*.35}s`}><defs><linearGradient id=${`nw-heat-${i}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="rgb(255,190,120)" stop-opacity="0"/><stop offset=".35" stop-color="rgb(255,200,140)" stop-opacity=".55"/><stop offset="1" stop-color="rgb(255,225,190)" stop-opacity="0"/></linearGradient></defs><path stroke=${`url(#nw-heat-${i})`} d="M12 120C4 104 20 92 12 76S4 48 12 32S20 10 12 0"/></svg>`)}</div>`;
    if(this.season==='winter') return html`${this.frostPane()}
      ${Array.from({length:few?2:4},(_,i)=>html`<i class="glint frost-glint" style=${`--gx:${84+(i*5)%14}%;--gy:${4+(i*9)%26}%;--gd:${-(i*.9)}s`}></i>`)}`;
    return nothing;
  }
  protected render() {
    const rain=['rainy','pouring','lightning-rainy','snowy-rainy'].includes(this.condition);
    const snow=['snowy','snowy-rainy','hail'].includes(this.condition);
    const storm=['lightning','lightning-rainy'].includes(this.condition);
    const fog=this.condition==='fog';
    const cloudy=!fog&&!['sunny','clear-night','unknown','exceptional'].includes(this.condition);
    const clearSky=['sunny','clear-night','partlycloudy','windy'].includes(this.condition);
    const windy=['windy','windy-variant'].includes(this.condition);
    const heavy=this.condition==='pouring';
    const n=this.quality==='low' ? 8 : heavy ? 80 : rain ? 44 : 20;
    const particles=(kind:string)=>Array.from({length:n},(_,i)=>{
      const depth=i%3;
      const duration=kind==='rain' ? (heavy ? .45 : .8)+depth*.22 : 3+depth;
      return html`<i class=${`particle ${kind} depth-${depth}`} style=${`--x:${(i*37+7)%100}%;--delay:${-((i*13)%37)/37*duration}s;--duration:${duration}s;--size:${2+depth}px;--rest:${(i*19+8)%88}%;--drift:${heavy ? -85 : -38}px`}></i>`;
    });
    return html`<div class=${`scene ${this.phase} ${this.condition}${this.season?` season-${this.season}`:''}`} style=${`--play:${this.animated&&this.visible&&this.pageVisible?'running':'paused'};--cloud-duration:${windy?6:Math.max(11,28-Math.min(Math.max(this.wind,0),60)/2.5)}s`} ?data-still=${!this.animated}>
      <div class="weather-art">${this.condition!=='unknown'&&this.condition!=='exceptional' ? html`
        ${this.phase==='night'&&!fog?this.stars(this.quality==='low'?8:clearSky?24:12):nothing}
        ${clearSky?html`<div class=${`orb ${this.phase==='night'?'moon':'sun'}`}><i></i></div>`:nothing}
        ${cloudy?html`${this.cloud('back')}${this.cloud('front')}${this.quality==='low'?nothing:this.cloud('small')}`:nothing}
        ${fog?this.fog():nothing}
        ${this.condition!=='unknown'?this.seasonal(rain||snow,storm,fog):nothing}
        ${rain?particles('rain'):nothing}${snow?particles(this.condition==='hail'?'hailstone':'snow'):nothing}
        ${windy?html`
          <svg class="gust" viewBox="0 0 420 100"><path d="M0 32h270c50 0 50-28 18-28M65 59h290c48 0 50 33 18 33M130 80h90"/></svg>
          <svg class="gust second" viewBox="0 0 420 100"><path d="M0 28h300c40 0 40-24 15-24M50 58h210c48 0 48 33 17 33"/></svg>
          ${Array.from({length:this.quality==='low'?2:5},(_,i)=>html`<div class="leaf-track" style=${`--leaf-top:${28+i*12}%;--leaf-delay:${-i*1.3}s;--leaf-time:${3.8+i*.5}s`}><svg class="leaf" viewBox="0 0 28 18"><path d="M2 9C8-2 21 1 27 4C23 17 9 20 2 9Z"/><path d="M0 10 22 6"/></svg></div>`)}
        `:nothing}
        ${storm?html`${BOLTS.map((b,i)=>html`<svg class=${`bolt b${i+1}`} viewBox="0 0 120 220" style=${`animation-delay:${b.delay}s`}><path d=${b.d}/></svg>`)}
          ${BOLTS.map((b,i)=>html`<div class=${`flash f${i+1}`} style=${`animation-delay:${b.delay}s`}></div>`)}`:nothing}
      `:nothing}</div>
    </div>`;
  }
  static styles=css`
    :host {display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none;}
    /* The sky colour is a faded layer under the artwork: the drawings stay crisp while the card background shows through.
       Night and storm keep more of their colour, because their artwork (stars, moon, bolts) needs a dark sky. */
    .scene {position:absolute;inset:0;overflow:hidden;--sky:linear-gradient(150deg,#5689b8,#6cb4df 65%,#a3d0e6);--tint:.42;}
    .scene::before {content:'';position:absolute;inset:0;background:var(--sky);opacity:var(--tint);}
    /* Seasonal light: a faint wash on the artwork side, under everything else. */
    .scene::after {content:'';position:absolute;inset:0;pointer-events:none;background:var(--season-light,none);}
    .season-spring {--season-light:radial-gradient(ellipse 60% 90% at 80% 100%,rgba(150,210,120,.14),transparent 70%);}
    .season-summer {--season-light:radial-gradient(ellipse 55% 80% at 78% 20%,rgba(255,196,110,.16),transparent 70%);}
    .season-autumn {--season-light:radial-gradient(ellipse 65% 90% at 85% 90%,rgba(230,140,60,.14),transparent 70%);}
    .season-winter {--season-light:radial-gradient(ellipse 60% 90% at 85% 10%,rgba(190,225,255,.18),transparent 70%);}
    .season-summer .sun {box-shadow:0 0 50px 22px #ffc96a66;}
    .drift {position:absolute;left:var(--dx);top:-8%;animation:drift-fall var(--dt) linear var(--dd) infinite;}
    .drift>i {display:block;animation:sway var(--sw) ease-in-out infinite alternate;}
    .petal {width:14px;height:14px;filter:drop-shadow(0 1px 1px #0002);}.petal-0 {fill:#f2a9c6;}.petal-1 {fill:#fbe3ec;}
    .maple {width:17px;height:17px;filter:drop-shadow(0 1px 1px #0003);}.maple-0 {fill:#d9772b;}.maple-1 {fill:#b9472c;}.maple-2 {fill:#dca33a;}
    .night .drift {filter:brightness(.6);}
    /* Heat rising over the artwork side, above the banner's bottom fade: warm wavy lines that climb and fade. */
    /* Heat rising from the ground on a sunny summer day: soft vertical plumes that waver as they climb, over a warm glow at the horizon. */
    .heat {position:absolute;left:0;right:0;top:20%;height:58%;background:radial-gradient(ellipse 50% 45% at 72% 100%,rgba(255,175,95,.24),transparent 75%);}
    .heat-plume {position:absolute;left:var(--hx);bottom:0;width:22px;height:var(--hh);fill:none;stroke-width:7;stroke-linecap:round;filter:blur(3px);opacity:0;transform-origin:50% 100%;animation:heat-rise 4.2s ease-out var(--hd) infinite,heat-sway var(--hs) ease-in-out var(--hd) infinite alternate;}
    /* Clear of the "En ce moment" column on wide cards; the corner is free on mobile. */
    /* A faint blue rim, as light catches real frost: keeps the white crystals visible on a light card. */
    /* The frost thins out from the corner (CSS mask: SVG masks are unreliable inside shadow roots). */
    .frost-pane {position:absolute;right:0;top:0;width:300px;height:185px;filter:drop-shadow(0 0 1px rgba(80,140,200,.6)) drop-shadow(0 0 3px rgba(150,195,235,.35));--frost-r:180px;-webkit-mask-image:radial-gradient(circle var(--frost-r) at 100% 0,#000 0,rgba(0,0,0,.75) 35%,rgba(0,0,0,.25) 68%,transparent 100%);mask-image:radial-gradient(circle var(--frost-r) at 100% 0,#000 0,rgba(0,0,0,.75) 35%,rgba(0,0,0,.25) 68%,transparent 100%);}
    /* Like the fog: a touch of the theme's text colour, so frost reads as bluish grey on a light card and white on a dark one. */
    .frost-veil {fill:color-mix(in srgb,var(--primary-text-color,#253047) 14%,#e8f4ff);opacity:.45;}
    .frost-fern {fill:none;stroke:color-mix(in srgb,var(--primary-text-color,#253047) 30%,#ffffff);stroke-width:1.2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:0;opacity:.95;animation:frost-draw 16s ease-in-out var(--fk) infinite;}
    .frost-film {transform-box:view-box;transform-origin:100% 0;animation:frost-film 16s ease-in-out infinite;}
    .frost-glint {animation:twinkle 2.8s ease-in-out var(--gd) infinite,frost-glint 16s linear infinite;}
    .glint {position:absolute;left:var(--gx);top:var(--gy);width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 6px 2px #eaf6ff;animation:twinkle 2.8s ease-in-out var(--gd) infinite;}
    .weather-art {display:contents;}
    .scene.night {--sky:linear-gradient(145deg,#0b1430,#1f3358 70%,#3a5274);--tint:.72;}
    .scene.twilight {--sky:linear-gradient(155deg,#404c8d,#d18d9b 65%,#f2c599);--tint:.5;}
    .scene.cloudy,.scene.windy-variant {--sky:linear-gradient(155deg,#4c657b,#8aa3b7 75%,#becbd4);}
    .scene.fog {--sky:linear-gradient(180deg,#8d9ba6,#b9c4cb 60%,#d3dade);--tint:.4;}
    .scene.rainy {--sky:linear-gradient(150deg,#263e56,#486580 65%,#6c8aa1);--tint:.55;}
    .scene.pouring {--sky:linear-gradient(150deg,#17293f,#35485e 65%,#536c83);--tint:.62;}
    .scene.lightning,.scene.lightning-rainy {--sky:linear-gradient(150deg,#070f1c,#162336 65%,#2a3a50);--tint:.82;}
    .scene.snowy,.scene.snowy-rainy,.scene.hail {--sky:linear-gradient(150deg,#476784,#8baac1 75%,#cbdee6);}
    .scene.night:not(.clear-night):not(.sunny):not(.partlycloudy) {--sky:linear-gradient(150deg,#111c2c,#334457 80%,#506276);--tint:.68;}
    .scene.night.lightning,.scene.night.lightning-rainy {--tint:.86;}
    .scene.unknown,.scene.exceptional {--sky:linear-gradient(145deg,#697782,#87949e);--tint:.3;}
    .orb {position:absolute;left:73%;top:36px;width:76px;height:76px;border-radius:50%;}
    .sun {background:radial-gradient(circle at 35% 35%,#fffce4,#ffe38a 60%,#edb65c);box-shadow:0 0 42px 16px #ffdf7d55;}
    .sun i {position:absolute;inset:-28px;border-radius:50%;background:repeating-conic-gradient(from 0deg,#fff5c800 0 14deg,#fff5c833 16deg 18deg,#fff5c800 20deg 30deg);mask-image:radial-gradient(circle,transparent 38%,black 50%,transparent 72%);animation:rays 38s linear infinite;}
    .moon {width:60px;height:60px;background:radial-gradient(circle at 34% 32%,#fffef6,#f6f2da 55%,#d6e0e4);box-shadow:0 0 16px 3px #fff9e0aa,0 0 50px 16px #e9efff40,0 0 110px 40px #c7d6ff1f;}
    .moon i {position:absolute;inset:-34px;border-radius:50%;background:radial-gradient(circle,#fff7d84d,transparent 66%);animation:halo 6s ease-in-out infinite alternate;}
    .moon::after {content:'';position:absolute;left:28%;top:52%;width:10px;height:10px;border-radius:50%;background:#c4cab744;box-shadow:15px -18px 0 -2px #c4cab73a,22px 5px 0 -3px #c4cab736;}
    .star {position:absolute;left:var(--sx);top:var(--sy);width:var(--ss);height:var(--ss);border-radius:50%;background:#fff;box-shadow:0 0 4px #fffc;animation:twinkle var(--st) ease-in-out var(--sd) infinite;}
    .star.bright {width:calc(var(--ss) + 1px);height:calc(var(--ss) + 1px);box-shadow:0 0 6px 1px #fff;}
    .star.bright::before,.star.bright::after {content:'';position:absolute;left:50%;top:50%;width:11px;height:1px;translate:-50% -50%;background:linear-gradient(90deg,transparent,#fffe,transparent);}
    .star.bright::after {rotate:90deg;}
    .cloud {position:absolute;width:190px;height:120px;overflow:visible;filter:drop-shadow(0 5px 7px #172d4317);animation:clouds var(--cloud-duration,32s) ease-in-out infinite alternate;}
    .cloud-rear {fill:#d6dde3;}.cloud-near {fill:#f4f7f8;}
    .cloud.back {left:55%;top:15px;width:220px;height:140px;opacity:.62;animation-delay:-12s;}
    .cloud.front {left:73%;top:90px;animation-delay:-4s;}
    .cloud.small {left:93%;top:6px;width:150px;height:95px;opacity:.7;animation-delay:-22s;}
    .night .cloud-rear {fill:#73869f;}.night .cloud-near {fill:#a0aec1;}
    .rainy .cloud-rear,.pouring .cloud-rear {fill:#7d90a5;}.lightning .cloud-rear,.lightning-rainy .cloud-rear {fill:#46566a;}
    .rainy .cloud-near,.pouring .cloud-near {fill:#b0c0cf;}.lightning .cloud-near,.lightning-rainy .cloud-near {fill:#728499;}
    .windy .cloud,.windy-variant .cloud {animation-name:wind-clouds;}
    .particle {position:absolute;left:var(--x);top:-40px;height:calc(100% + 80px);width:3px;animation:fall var(--duration) linear var(--delay) infinite;}
    .particle::before {content:'';position:absolute;top:0;left:0;display:block;}
    .rain::before {width:1.8px;height:23px;border-radius:2px;background:linear-gradient(#e4f3ff38,#eef8fff5);rotate:9deg;}
    .rain.depth-0 {opacity:.55;}.rain.depth-1 {opacity:.82;}.rain.depth-2::before {width:2.3px;height:30px;}
    .pouring .rain::before {height:34px;rotate:15deg;}.pouring .rain.depth-2::before {height:44px;width:2.6px;}
    .snow {animation-name:snow;}.snow::before {width:var(--size);height:var(--size);border-radius:50%;background:#ffffffdb;box-shadow:0 0 3px #fff5;}
    .hailstone {animation-name:hail;}.hailstone::before {width:5px;height:5px;border-radius:50%;background:#e9f4ff;}
    .fog-sun {position:absolute;left:70%;top:30px;width:84px;height:84px;border-radius:50%;background:radial-gradient(circle,#fffbeae6,#fff4d080 45%,transparent 70%);filter:blur(1.5px);animation:fog-sun 9s ease-in-out infinite alternate;}
    /* Mist takes a little of the theme's text colour: pale grey on a light card, near white on a dark one. */
    .fog-band {position:absolute;left:var(--fl);top:var(--fy);width:var(--fw);height:24%;fill:color-mix(in srgb,var(--primary-text-color,#253047) 30%,#eef3f6);filter:blur(10px);animation:fog-drift var(--fd) ease-in-out var(--fdelay) infinite alternate,fog-breathe calc(var(--fd) * .7) ease-in-out var(--fdelay) infinite alternate;}
    .fog-band.depth-0 {--fo:.28;}.fog-band.depth-1 {--fo:.4;height:28%;}.fog-band.depth-2 {--fo:.52;height:32%;filter:blur(14px);}
    .night .fog-band {fill:#a9b6c4;}
    .gust {position:absolute;width:65%;height:95px;left:0;top:25%;fill:none;stroke:#f1f8ffd9;stroke-width:2;stroke-linecap:round;animation:gust 4s ease-in-out infinite;}
    .gust.second {top:57%;width:80%;opacity:.65;animation-delay:-2s;}
    .leaf-track {position:absolute;left:0;top:var(--leaf-top);width:100%;height:20px;animation:leaves var(--leaf-time) linear var(--leaf-delay) infinite;}
    .leaf {width:20px;height:14px;animation:tumble 1.6s linear infinite;filter:drop-shadow(0 2px 2px #0002);}
    .leaf path:first-child {fill:#e4c080;}.leaf path:last-child {fill:none;stroke:#a5854d;stroke-width:1.4;}
    .bolt {position:absolute;fill:none;stroke:#fff;stroke-width:3.6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 3px #f2f8ff) drop-shadow(0 0 16px #8fc2ff);opacity:0;animation:lightning 6s linear infinite;}
    .bolt.b1 {left:72%;top:80px;width:100px;height:170px;}
    .bolt.b2 {left:88%;top:55px;width:60px;height:130px;stroke-width:2.4;}
    .bolt.b3 {left:58%;top:28px;width:78px;height:150px;stroke-width:3;}
    /* One flash per bolt, centred on it and painted after the clouds so they light up too.
       Each strike flickers twice; strikes are ≥ 1.8 s apart, so never more than 2 flashes in a second
       (photosensitivity limit: 3). The text side of the card stays out of the bright centre. */
    .flash {position:absolute;inset:0;--fx:76%;--fy:30%;background:radial-gradient(ellipse 48% 105% at var(--fx) var(--fy),#f4f9ff,#c9dff7a6 30%,transparent 68%);mix-blend-mode:screen;opacity:0;animation:storm-flash 6s linear infinite;}
    .flash.f2 {--fx:92%;--fy:22%;}.flash.f3 {--fx:62%;--fy:18%;}
    .scene *, .scene *::after, .scene *::before {animation-play-state:var(--play,paused);}
    .scene[data-still] * {animation:none;}.scene[data-still] .particle {translate:0 var(--rest);}.scene[data-still] .drift {top:var(--rest);}.scene[data-still] .frost-fern {stroke-dashoffset:0;}
    .scene[data-still] .bolt.b1 {opacity:.8;}.scene[data-still] .flash {opacity:0;}
    @keyframes clouds {from{translate:-24px 0;}to{translate:32px 4px;}}
    @keyframes wind-clouds {from{translate:-75px -3px;}to{translate:90px 6px;}}
    @keyframes rays {to{rotate:360deg;}}
    @keyframes halo {from{opacity:.55;scale:.94;}to{opacity:1;scale:1.06;}}
    @keyframes twinkle {0%,100%{opacity:.25;scale:.7;}50%{opacity:1;scale:1.15;}}
    @keyframes fall {from{translate:0 0;}to{translate:var(--drift) 100%;}}
    @keyframes snow {0%{translate:0 0;}50%{translate:18px 50%;}100%{translate:-8px 100%;}}
    @keyframes hail {0%{translate:0 0;}85%{translate:-12px 85%;}100%{translate:5px 75%;}}
    @keyframes fog-drift {from{translate:calc(var(--dir) * -7%) 0;}to{translate:calc(var(--dir) * 7%) 6px;}}
    @keyframes fog-sun {from{opacity:.55;}to{opacity:.9;}}
    @keyframes drift-fall {from{top:-8%;translate:0 0;}to{top:108%;translate:-40px 0;}}
    @keyframes sway {from{translate:-10px 0;rotate:-25deg;}to{translate:10px 0;rotate:35deg;}}
    @keyframes heat-rise {0%{translate:0 18px;opacity:0;}30%{opacity:.85;}70%{opacity:.55;}100%{translate:0 -40px;opacity:0;}}
    @keyframes heat-sway {from{transform:skewX(-9deg) scaleX(.85);}to{transform:skewX(9deg) scaleX(1.2);}}
    /* A 16 s cycle: the film spreads from the corner, ferns draw one after another, hold, then everything melts. */
    @keyframes frost-film {0%,100%{opacity:0;transform:scale(.35);}35%,70%{opacity:1;transform:scale(1);}88%{opacity:0;transform:scale(1);}}
    @keyframes frost-draw {0%,6%{stroke-dashoffset:1;opacity:0;}10%{opacity:.95;}40%,68%{stroke-dashoffset:0;opacity:.95;}86%,100%{stroke-dashoffset:0;opacity:0;}}
    @keyframes frost-glint {0%,38%,80%,100%{opacity:0;}50%,66%{opacity:1;}}
    @keyframes fog-breathe {from{opacity:calc(var(--fo) * .6);}to{opacity:var(--fo);}}
    @keyframes gust {0%{translate:-110% 0;opacity:0;}20%,75%{opacity:.75;}100%{translate:160% -15px;opacity:0;}}
    @keyframes leaves {from{translate:-5% 0;}to{translate:110% -18px;}}
    @keyframes tumble {to{rotate:360deg;}}
    @keyframes lightning {0%,4.5%,100%{opacity:0;}.6%,1.6%{opacity:1;}2.2%{opacity:.3;}3%{opacity:1;}}
    @keyframes storm-flash {0%,4.5%,100%{opacity:0;}.6%{opacity:.7;}1.6%{opacity:.5;}2.2%{opacity:.1;}3%{opacity:.55;}}
    @container(max-width:650px) {
      .weather-art {display:block;position:absolute;top:0;right:0;width:100%;height:300px;overflow:hidden;}
      .orb {left:auto;right:12%;top:36px;}.cloud.back {left:auto;right:22%;top:20px;width:170px;}.cloud.front {left:auto;right:0;top:90px;width:150px;}.cloud.small {left:auto;right:-12%;top:6px;width:120px;}
      .bolt.b1 {left:auto;right:18%;}.bolt.b2 {left:auto;right:2%;}.bolt.b3 {left:auto;right:42%;}
      .flash.f1 {--fx:70%;}.flash.f2 {--fx:94%;}.flash.f3 {--fx:48%;}
      .fog-sun {left:auto;right:14%;}
      .frost-pane {width:220px;height:135px;--frost-r:132px;}
    }
    @media(prefers-reduced-motion:reduce) {.scene *{animation:none!important;}.particle{translate:0 var(--rest);}.drift{top:var(--rest);}.frost-fern{stroke-dashoffset:0;}.bolt.b1{opacity:.8;}.flash{opacity:0;}}
  `;
}

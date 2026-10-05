import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/** Original vector/CSS weather scene. All artwork is bundled; no remote assets. */
@customElement('niak-weather-sky')
export class NiakWeatherSky extends LitElement {
  @property() condition='unknown';
  @property() phase='unknown';
  @property() quality:'low'|'standard'='standard';
  @property({type:Boolean}) animated=true;
  @property({type:Number}) wind=0;
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
  protected render() {
    const rain=['rainy','pouring','lightning-rainy','snowy-rainy'].includes(this.condition);
    const snow=['snowy','snowy-rainy','hail'].includes(this.condition);
    const storm=['lightning','lightning-rainy'].includes(this.condition);
    const cloudy=!['sunny','clear-night','unknown','exceptional'].includes(this.condition);
    const windy=['windy','windy-variant'].includes(this.condition);
    const heavy=this.condition==='pouring';
    const n=this.quality==='low' ? 8 : heavy ? 64 : rain ? 32 : 20;
    const particles=(kind:string)=>Array.from({length:n},(_,i)=>{
      const depth=i%3;
      const duration=kind==='rain' ? (heavy ? .55 : 1.05)+depth*.28 : 3.8+depth*1.2;
      return html`<i class=${`particle ${kind} depth-${depth}`} style=${`--x:${(i*37+7)%100}%;--delay:${-((i*13)%37)/37*duration}s;--duration:${duration}s;--size:${2+depth}px;--rest:${(i*19+8)%88}%;--drift:${heavy ? -85 : -38}px`}></i>`;
    });
    return html`<div class=${`scene ${this.phase} ${this.condition}`} style=${`--play:${this.animated&&this.visible&&this.pageVisible?'running':'paused'};--cloud-duration:${windy?8:Math.max(15,38-Math.min(Math.max(this.wind,0),60)/2)}s`} ?data-still=${!this.animated}>
      <div class="weather-art">${this.condition!=='unknown'&&this.condition!=='exceptional' ? html`
        ${this.phase==='night'?html`<div class="stars"></div>`:nothing}
        ${['sunny','clear-night','partlycloudy','windy'].includes(this.condition)?html`<div class=${`orb ${this.phase==='night'?'moon':'sun'}`}><i></i></div>`:nothing}
        ${cloudy?html`${this.cloud('back')}${this.cloud('front')}${this.quality==='low'?nothing:this.cloud('small')}`:nothing}
        ${rain?particles('rain'):nothing}${snow?particles(this.condition==='hail'?'hailstone':'snow'):nothing}
        ${this.condition==='fog'?html`<div class="mist"></div><div class="mist lower"></div>`:nothing}
        ${windy?html`
          <svg class="gust" viewBox="0 0 420 100"><path d="M0 32h270c50 0 50-28 18-28M65 59h290c48 0 50 33 18 33M130 80h90"/></svg>
          <svg class="gust second" viewBox="0 0 420 100"><path d="M0 28h300c40 0 40-24 15-24M50 58h210c48 0 48 33 17 33"/></svg>
          ${Array.from({length:this.quality==='low'?2:5},(_,i)=>html`<div class="leaf-track" style=${`--leaf-top:${28+i*12}%;--leaf-delay:${-i*1.3}s;--leaf-time:${4.5+i*.6}s`}><svg class="leaf" viewBox="0 0 28 18"><path d="M2 9C8-2 21 1 27 4C23 17 9 20 2 9Z"/><path d="M0 10 22 6"/></svg></div>`)}
        `:nothing}
        ${storm?html`<div class="storm-glow"></div><svg class="bolt" viewBox="0 0 120 220"><path d="M58 0 43 40 61 52 35 88 49 97 24 144 37 151 12 217M43 40 23 56 34 67 17 91M35 88 72 107 64 121 88 147"/></svg>
          <svg class="bolt distant" viewBox="0 0 120 220"><path d="M42 0 62 35 48 52 81 87 67 102 92 153 80 171 104 216M62 35 85 40 81 58 105 80"/></svg>`:nothing}
      `:nothing}</div>
    </div>`;
  }
  static styles=css`
    :host {display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none;}
    .scene {position:absolute;inset:0;overflow:hidden;background:linear-gradient(150deg,#5689b8,#6cb4df 65%,#a3d0e6);}
    .weather-art {display:contents;}
    .scene.night {background:linear-gradient(145deg,#111b38,#273c63 70%,#425b7b);}
    .scene.twilight {background:linear-gradient(155deg,#404c8d,#d18d9b 65%,#f2c599);}
    .scene.cloudy,.scene.fog,.scene.windy-variant {background:linear-gradient(155deg,#4c657b,#8aa3b7 75%,#becbd4);}
    .scene.rainy,.scene.pouring,.scene.lightning,.scene.lightning-rainy {background:linear-gradient(150deg,#263e56,#486580 65%,#6c8aa1);}
    .scene.pouring,.scene.lightning,.scene.lightning-rainy {background:linear-gradient(150deg,#17293f,#35485e 65%,#536c83);}
    .scene.snowy,.scene.snowy-rainy,.scene.hail {background:linear-gradient(150deg,#476784,#8baac1 75%,#cbdee6);}
    .scene.night:not(.clear-night):not(.sunny):not(.partlycloudy) {background:linear-gradient(150deg,#111c2c,#334457 80%,#506276);}
    .scene.unknown,.scene.exceptional {background:linear-gradient(145deg,#697782,#87949e);}
    .orb {position:absolute;left:73%;top:36px;width:76px;height:76px;border-radius:50%;}
    .sun {background:radial-gradient(circle at 35% 35%,#fffce4,#ffe38a 60%,#edb65c);box-shadow:0 0 42px 16px #ffdf7d55;}
    .sun i {position:absolute;inset:-28px;border-radius:50%;background:repeating-conic-gradient(from 0deg,#fff5c800 0 14deg,#fff5c833 16deg 18deg,#fff5c800 20deg 30deg);mask-image:radial-gradient(circle,transparent 38%,black 50%,transparent 72%);animation:rays 50s linear infinite;}
    .moon {background:radial-gradient(circle at 30% 30%,#f6f3db,#c3d5e0);box-shadow:0 0 28px #e7eef54d;width:52px;height:52px;}
    .moon::after {content:'';position:absolute;inset:3px 3px 12px 14px;border-radius:50%;background:#aebed033;}
    .stars {position:absolute;left:60%;top:24px;width:2px;height:2px;background:#fff;border-radius:50%;box-shadow:26px 41px #fffd,74px -7px #fff9,118px 65px #fffb,166px 13px #fff,216px 71px #fff9,256px 22px #fffc,307px 104px #fff8,48px 116px #fff9,135px 190px #fffa,320px 230px #fff9;animation:stars 6s ease-in-out infinite alternate;}
    .cloud {position:absolute;width:190px;height:120px;overflow:visible;filter:drop-shadow(0 5px 7px #172d4317);animation:clouds var(--cloud-duration,32s) ease-in-out infinite alternate;}
    .cloud-rear {fill:#d6dde3;}.cloud-near {fill:#f4f7f8;}
    .cloud.back {left:55%;top:15px;width:220px;height:140px;opacity:.62;animation-delay:-12s;}
    .cloud.front {left:73%;top:90px;animation-delay:-4s;}
    .cloud.small {left:93%;top:6px;width:150px;height:95px;opacity:.7;animation-delay:-22s;}
    .night .cloud-rear {fill:#73869f;}.night .cloud-near {fill:#a0aec1;}
    .rainy .cloud-rear,.pouring .cloud-rear,.lightning .cloud-rear,.lightning-rainy .cloud-rear {fill:#7d90a5;}
    .rainy .cloud-near,.pouring .cloud-near,.lightning .cloud-near,.lightning-rainy .cloud-near {fill:#b0c0cf;}
    .windy .cloud,.windy-variant .cloud {animation-name:wind-clouds;}
    .particle {position:absolute;left:var(--x);top:-40px;height:calc(100% + 80px);width:3px;animation:fall var(--duration) linear var(--delay) infinite;}
    .particle::before {content:'';position:absolute;top:0;left:0;display:block;}
    .rain::before {width:1.5px;height:20px;border-radius:2px;background:linear-gradient(#d9f0ff26,#d9f0ffdb);rotate:9deg;}
    .rain.depth-0 {opacity:.4;}.rain.depth-1 {opacity:.7;}.rain.depth-2::before {width:2px;height:27px;}
    .pouring .rain::before {height:32px;rotate:15deg;}.pouring .rain.depth-2::before {height:42px;width:2.4px;}
    .snow {animation-name:snow;}.snow::before {width:var(--size);height:var(--size);border-radius:50%;background:#ffffffdb;box-shadow:0 0 3px #fff5;}
    .hailstone {animation-name:hail;}.hailstone::before {width:5px;height:5px;border-radius:50%;background:#e9f4ff;}
    .mist {position:absolute;left:-20%;right:-20%;height:42%;top:35%;background:linear-gradient(transparent,#e0eaf15c,transparent);filter:blur(12px);animation:mist 16s ease-in-out infinite alternate;}
    .mist.lower {top:65%;animation-delay:-8s;}
    .gust {position:absolute;width:65%;height:95px;left:0;top:25%;fill:none;stroke:#f1f8ffd9;stroke-width:2;stroke-linecap:round;animation:gust 4.8s ease-in-out infinite;}
    .gust.second {top:57%;width:80%;opacity:.65;animation-delay:-2.4s;}
    .leaf-track {position:absolute;left:0;top:var(--leaf-top);width:100%;height:20px;animation:leaves var(--leaf-time) linear var(--leaf-delay) infinite;}
    .leaf {width:20px;height:14px;animation:tumble 2s linear infinite;filter:drop-shadow(0 2px 2px #0002);}
    .leaf path:first-child {fill:#e4c080;}.leaf path:last-child {fill:none;stroke:#a5854d;stroke-width:1.4;}
    .bolt {position:absolute;left:72%;top:80px;width:100px;height:170px;fill:none;stroke:#edf6ff;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 5px #c1ddff);opacity:0;animation:lightning 8s linear infinite;}
    .bolt.distant {left:88%;top:55px;width:60px;height:130px;stroke-width:1.8;animation-delay:-4s;}
    .storm-glow {position:absolute;inset:0;background:radial-gradient(ellipse at 76% 30%,#cde5ff4d,transparent 28%);opacity:0;animation:lightning-glow 8s linear infinite;}
    .scene *, .scene *::after, .scene *::before {animation-play-state:var(--play,paused);}
    .scene[data-still] * {animation:none;}.scene[data-still] .particle {translate:0 var(--rest);}
    .scene[data-still] .bolt {opacity:.8;}.scene[data-still] .storm-glow {opacity:0;}
    @keyframes clouds {from{translate:-24px 0;}to{translate:32px 4px;}}
    @keyframes wind-clouds {from{translate:-75px -3px;}to{translate:90px 6px;}}
    @keyframes rays {to{rotate:360deg;}}
    @keyframes stars {from{opacity:.4;}to{opacity:.9;}}
    @keyframes fall {from{translate:0 0;}to{translate:var(--drift) 100%;}}
    @keyframes snow {0%{translate:0 0;}50%{translate:18px 50%;}100%{translate:-8px 100%;}}
    @keyframes hail {0%{translate:0 0;}85%{translate:-12px 85%;}100%{translate:5px 75%;}}
    @keyframes mist {to{translate:35px 4px;opacity:.7;}}
    @keyframes gust {0%{translate:-110% 0;opacity:0;}20%,75%{opacity:.75;}100%{translate:160% -15px;opacity:0;}}
    @keyframes leaves {from{translate:-5% 0;}to{translate:110% -18px;}}
    @keyframes tumble {to{rotate:360deg;}}
    @keyframes lightning {0%,5%,100%{opacity:0;}1%{opacity:1;}2%{opacity:.8;}4%{opacity:0;}}
    @keyframes lightning-glow {0%,6%,100%{opacity:0;}1%{opacity:.7;}5%{opacity:0;}}
    @container(max-width:650px) {
      .weather-art {display:block;position:absolute;top:0;right:0;width:100%;height:300px;overflow:hidden;}
      .orb {left:auto;right:12%;top:36px;}.cloud.back {left:auto;right:22%;top:20px;width:170px;}.cloud.front {left:auto;right:0;top:90px;width:150px;}.cloud.small {left:auto;right:-12%;top:6px;width:120px;}
      .bolt {left:auto;right:18%;top:80px;}.bolt.distant {left:auto;right:2%;top:55px;}.stars {left:auto;right:40%;top:24px;}
    }
    @media(prefers-reduced-motion:reduce) {.scene *{animation:none!important;}.particle{translate:0 var(--rest);}.bolt{opacity:.8;}.storm-glow{opacity:0;}}
  `;
}

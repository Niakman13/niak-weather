import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/** Original CSS scene inspired by living-sky weather cards. No downloaded assets or runtime dependency. */
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
    super.connectedCallback(); this.visibility(); document.addEventListener('visibilitychange',this.visibility);
    if(typeof IntersectionObserver!=='undefined') {
      this.observer=new IntersectionObserver(entries=>{this.visible=entries.some(e=>e.isIntersecting);});this.observer.observe(this);
    } else this.visible=true;
  }
  disconnectedCallback() { super.disconnectedCallback();this.observer?.disconnect();document.removeEventListener('visibilitychange',this.visibility); }
  protected render() {
    const rain=['rainy','pouring','lightning-rainy','snowy-rainy'].includes(this.condition);
    const snow=['snowy','snowy-rainy','hail'].includes(this.condition);
    const storm=['lightning','lightning-rainy'].includes(this.condition);
    const cloudy=!['sunny','clear-night','unknown','exceptional'].includes(this.condition);
    const windy=['windy','windy-variant'].includes(this.condition);
    const n=this.quality==='low' ? 8 : this.condition==='pouring' ? 28 : 18;
    const particles=(kind:string)=>Array.from({length:n},(_,i)=>html`<i class=${`particle ${kind}`} style=${`--x:${(i*37+11)%100}%;--delay:${-(i%9)*.37}s;--duration:${kind==='rain' ? 1+(i%4)*.17 : 4+(i%5)}s;--size:${2+i%3}px`}></i>`);
    return html`<div class=${`scene ${this.phase} ${this.condition}`} style=${`--play:${this.animated && this.visible && this.pageVisible ? 'running':'paused'};--cloud-duration:${Math.max(10,40-Math.min(Math.max(this.wind,0),60)/2)}s`} ?data-still=${!this.animated}>
      ${this.condition!=='unknown' && this.condition!=='exceptional' ? html`
        ${this.phase==='night' ? html`<div class="stars"></div>` : nothing}
        ${['sunny','clear-night','partlycloudy','windy'].includes(this.condition) ? html`<div class=${`orb ${this.phase==='night' ? 'moon':'sun'}`}><i></i></div>` : nothing}
        ${cloudy ? html`<div class="cloud back"></div><div class="cloud front"></div>${this.quality==='low' ? nothing : html`<div class="cloud small"></div>`}` : nothing}
        ${rain ? particles('rain') : nothing}${snow ? particles(this.condition==='hail' ? 'hailstone':'snow') : nothing}
        ${this.condition==='fog' ? html`<div class="mist"></div><div class="mist lower"></div>` : nothing}
        ${windy ? html`<div class="gust"></div><div class="gust second"></div>` : nothing}
        ${storm ? html`<svg class="bolt" viewBox="0 0 48 80"><path d="M29 0 5 44h17L17 80l26-49H25Z" fill="currentColor"/></svg>` : nothing}
      ` : nothing}
    </div>`;
  }
  static styles=css`
    :host { display:block; position:absolute; inset:0; overflow:hidden; pointer-events:none; }
    .scene { position:absolute; inset:0; overflow:hidden; background:linear-gradient(160deg,#316baf,#78bde1 70%,#c7e6ee); }
    .scene.night { background:linear-gradient(145deg,#111b38,#273c63 70%,#425b7b); }
    .scene.twilight { background:linear-gradient(155deg,#404c8d,#d18d9b 65%,#f2c599); }
    .scene.cloudy,.scene.fog,.scene.windy-variant { background:linear-gradient(155deg,#4c657b,#8aa3b7 75%,#becbd4); }
    .scene.rainy,.scene.pouring,.scene.lightning,.scene.lightning-rainy { background:linear-gradient(150deg,#283d54,#5b778b 70%,#93a8b3); }
    .scene.snowy,.scene.snowy-rainy,.scene.hail { background:linear-gradient(150deg,#476784,#8baac1 75%,#cbdee6); }
    .scene.night:not(.clear-night):not(.sunny):not(.partlycloudy) { background:linear-gradient(150deg,#111c2c,#334457 80%,#506276); }
    .scene.unknown,.scene.exceptional { background:linear-gradient(145deg,#697782,#87949e); }
    .orb { position:absolute; left:25%; top:18%; width:64px; height:64px; border-radius:50%; }
    .sun { background:radial-gradient(circle at 35% 35%,#fffce4,#ffe38a 60%,#edb65c); box-shadow:0 0 34px 14px #ffdf7d55; }
    .sun i { position:absolute; inset:-28px; border-radius:50%; background:repeating-conic-gradient(from 0deg,#fff5c800 0 14deg,#fff5c833 16deg 18deg,#fff5c800 20deg 30deg); mask-image:radial-gradient(circle,transparent 38%,black 50%,transparent 72%); animation:rays 50s linear infinite; }
    .moon { background:radial-gradient(circle at 30% 30%,#f6f3db,#c3d5e0); box-shadow:0 0 28px #e7eef54d; width:45px;height:45px; }
    .moon::after { content:'';position:absolute;inset:3px 3px 12px 14px;border-radius:50%;background:#aebed033; }
    .stars { position:absolute; left:9%; top:14%; width:2px; height:2px; background:#fff;border-radius:50%; box-shadow:26px 41px #fffd,74px -7px #fff9,118px 65px #fffb,166px 13px #fff,216px 71px #fff9,256px 22px #fffc,307px 104px #fff8,48px 116px #fff9; animation:stars 6s ease-in-out infinite alternate; }
    .cloud { position:absolute; width:240px;height:100px;left:0;top:20%;background:radial-gradient(ellipse at 20% 72%,#eef5faee 0 22%,transparent 24%),radial-gradient(ellipse at 42% 48%,#eef5faee 0 30%,transparent 32%),radial-gradient(ellipse at 65% 62%,#eef5faee 0 28%,transparent 30%),radial-gradient(ellipse at 84% 75%,#eef5faee 0 17%,transparent 19%); filter:blur(6px);animation:clouds var(--cloud-duration,32s) ease-in-out infinite alternate; }
    .cloud.back { left:-15%;top:4%;opacity:.45;transform:scale(1.15);animation-delay:-12s; }
    .cloud.front { left:28%;top:35%;opacity:.65;animation-delay:-4s; }
    .cloud.small { left:55%;top:0;opacity:.35;width:180px;animation-delay:-22s; }
    .night .cloud { opacity:.25; }
    .rainy .cloud,.pouring .cloud,.lightning .cloud,.lightning-rainy .cloud { filter:blur(10px) brightness(.6);opacity:.75; }
    .particle { position:absolute;left:var(--x);top:-12%; animation-delay:var(--delay);animation-duration:var(--duration);animation-iteration-count:infinite;animation-timing-function:linear; }
    .rain { width:1px;height:19px;background:linear-gradient(transparent,#d4e9f6bd);animation-name:rain; }
    .snow { width:var(--size);height:var(--size);border-radius:50%;background:#ffffffdb;box-shadow:0 0 4px #fff6;animation-name:snow; }
    .hailstone { width:4px;height:4px;border-radius:50%;background:#e9f4ff;animation-name:hail; }
    .mist { position:absolute;left:-20%;right:-20%;height:42%;top:35%;background:linear-gradient(transparent,#e0eaf15c,transparent);filter:blur(12px);animation:mist 16s ease-in-out infinite alternate; }
    .mist.lower { top:65%;animation-delay:-8s; }
    .gust { position:absolute;width:90px;height:18px;border-top:2px solid #ffffff60;border-radius:50%;left:10%;top:60%;animation:gust 5s ease-in-out infinite; }
    .gust.second { top:77%;animation-delay:-2.5s;width:60px; }
    .bolt { position:absolute;left:36%;top:28%;width:28px;height:48px;color:#ffeda9;filter:drop-shadow(0 0 7px #fff0ac66);animation:bolt 6s ease-in-out infinite alternate; }
    .scene *, .scene *::after { animation-play-state:var(--play,paused); }
    .scene[data-still] * { animation:none; }
    .scene[data-still] .particle { top:50%; }
    @keyframes clouds { from { translate:-24px 0; } to { translate:32px 4px; } }
    @keyframes rays { to { rotate:360deg; } }
    @keyframes stars { from { opacity:.4; } to { opacity:.9; } }
    @keyframes rain { from { translate:12px -20px; } to { translate:-30px 320px; } }
    @keyframes snow { 0% { translate:0 -20px; } 50% { translate:18px 140px; } 100% { translate:-8px 300px; } }
    @keyframes hail { 0% { translate:0 -10px; } 85% { translate:-12px 240px; } 100% { translate:5px 210px; } }
    @keyframes mist { to { translate:35px 4px; opacity:.7; } }
    @keyframes gust { 0% { translate:-60px 0;opacity:0; } 30%,65% { opacity:.8; } 100% { translate:240px -10px;opacity:0; } }
    @keyframes bolt { from { opacity:.35; } to { opacity:.75; } }
    @media(prefers-reduced-motion:reduce) { .scene * { animation:none !important; } .particle { top:50%; } }
  `;
}

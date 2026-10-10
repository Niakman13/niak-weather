import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cleanConfig } from './config';
import { displayed } from './display';
import { bubbles, pieces, tokens } from './ui/charter';
import { renderTile, tileStyles } from './views/tile';
import { fullStyles, renderFull, type SectionId } from './views/full';
import { heroStyles } from './views/hero';
import { todayStyles } from './views/today';
import { forecastStyles } from './views/forecasts';
import { airStyles } from './views/air';
import './ui/weather-sky';
import './editor/niak-weather-card-editor';
import { VIEW_VERSION, type ViewMessage, type WeatherView } from './view';
import type { HomeAssistant, WeatherCardConfig } from './types';

const HOLD_MS = 500;
/** Phones and tablets: unless set otherwise, the tile's sky is lightened (fewer drops, clouds and leaves); its drawing is scaled down there anyway. */
const LIGHT_SKY = matchMedia('(pointer: coarse)');
let instances = 0;

/** Why there is no weather to show, and what to do about it. */
type Problem = 'missing' | 'not_configured' | 'choose_entry' | 'not_found' | 'version';
const PROBLEMS: Record<Problem, { title: string; text: string; links?: [string, string][] }> = {
  // Home Assistant only starts an integration once it is added: downloaded from HACS but not added yet, it does not answer either.
  missing: { title: 'Niak Weather a besoin de son intégration',
    text: 'Depuis la version 2.0, la carte reçoit ses calculs de l’intégration Niak Weather. Déjà téléchargée depuis HACS ? Ajoutez-la dans Paramètres → Appareils et services. Sinon, installez-la depuis HACS, redémarrez Home Assistant, puis ajoutez-la.',
    links: [['Ajouter l’intégration', '/config/integrations/dashboard/add?domain=niak_weather'], ['L’installer', 'https://github.com/Niakman13/niak-weather-integration#installation']] },
  not_configured: { title: 'Ajoutez l’intégration Niak Weather',
    text: 'Elle est installée mais pas encore configurée. Elle peut reprendre les réglages de vos cartes.',
    links: [['Ajouter l’intégration', '/config/integrations/dashboard/add?domain=niak_weather']] },
  choose_entry: { title: 'Choisissez un lieu', text: 'Plusieurs lieux Niak Weather sont configurés : choisissez celui de cette carte dans ses réglages.' },
  not_found: { title: 'Lieu introuvable', text: 'Le lieu de cette carte n’existe plus : choisissez-en un autre dans ses réglages.' },
  version: { title: 'Mettez à jour la carte', text: 'L’intégration Niak Weather est plus récente que cette carte : mettez la carte à jour dans HACS.' },
};

@customElement('niak-weather-card')
export class NiakWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: WeatherCardConfig;
  /** What the integration computed, as it last sent it. */
  @state() private view?: WeatherView;
  @state() private problem?: Problem;
  /** The tile is unfolded (remembered on this device). */
  @state() private open = false;
  /** The full card is shown over the page, after a long press on the tile. */
  @state() private dialogOpen = false;
  @state() private folded: Record<SectionId, boolean> = { today: false, predictions: false };
  private readonly uid = `nw${++instances}`;
  private subscription?: Promise<() => Promise<void>>;
  private subscribedTo?: string;
  private retry?: ReturnType<typeof setTimeout>;
  private press?: { x: number; y: number; long: boolean; timer: ReturnType<typeof setTimeout>; frame: number };

  public setConfig(config: WeatherCardConfig): void {
    const next = cleanConfig(config), old = this.config;
    if (old && JSON.stringify(old) === JSON.stringify(next)) return;
    this.config = next;
    if (!old || old.collapse_today !== next.collapse_today || old.collapse_predictions !== next.collapse_predictions)
      this.folded = { today: next.collapse_today === true, predictions: next.collapse_predictions === true };
    if (!old || old.format !== next.format || old.entry_id !== next.entry_id) this.open = this.remembered(next);
    // Another place: its own view, from a new subscription.
    if (old && old.entry_id !== next.entry_id) { this.unsubscribe(); this.view = undefined; this.problem = undefined; }
  }
  public static getStubConfig(): WeatherCardConfig { return { type: 'custom:niak-weather-card' }; }
  public static getConfigElement(): HTMLElement { return document.createElement('niak-weather-card-editor'); }
  public getCardSize(): number {
    if (!this.config) return 10;
    if (this.tile) return this.open ? 7 : 2;
    return Math.max(1, (this.config.show_synthesis === false ? 0 : 4) + (this.config.show_today === false ? 0 : 5) + (this.config.show_predictions === false ? 0 : 4));
  }
  public getGridOptions() { return this.tile ? { columns: 12, rows: 'auto', min_columns: 6 } : { columns: 'full', rows: 'auto' }; }

  /** Tile and intermediate formats: one band that unfolds; the full card is the weather page. */
  private get tile(): boolean { return !!this.config?.format && this.config.format !== 'full'; }
  private key(config = this.config!) { return `niak-weather:open:${config.format}:${config.entry_id ?? config.weather_entity ?? ''}`; }
  private remembered(config: WeatherCardConfig): boolean {
    try { const v = localStorage.getItem(this.key(config)); if (v !== null) return v === '1'; } catch { /* private browsing */ }
    return config.format === 'intermediate';
  }

  public connectedCallback(): void { super.connectedCallback(); this.subscribe(); }
  public disconnectedCallback(): void { super.disconnectedCallback(); this.cancelPress(); this.unsubscribe(); }
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has('hass') || changed.has('config')) this.subscribe();
    // Home Assistant pushes every state change: the card only redraws when the integration sends a new view.
    return !(changed.size === 1 && changed.has('hass'));
  }
  protected updated(): void {
    this.toggleAttribute('still', this.config?.weather_animations === false);
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>('dialog');
    if (dialog && this.dialogOpen && !dialog.open) dialog.showModal();
  }

  /** One live subscription to the integration's view of this card's place. */
  private subscribe(): void {
    const connection = this.hass?.connection, config = this.config;
    if (!connection || !config || !this.isConnected) return;
    const place = config.entry_id ?? '';
    if (this.subscription && this.subscribedTo === place) return;
    this.unsubscribe();
    this.subscribedTo = place;
    const subscription = connection.subscribeMessage<ViewMessage | { version: number; reload: true }>(m => this.receive(m),
      { type: 'niak_weather/subscribe', ...(config.entry_id ? { entry_id: config.entry_id } : {}) });
    this.subscription = subscription;
    subscription.catch((error: { code?: string }) => {
      if (this.subscription !== subscription) return;
      this.subscription = undefined;
      const code = error?.code;
      this.problem = code === 'not_configured' || code === 'choose_entry' || code === 'not_found' ? code : 'missing';
      // Home Assistant may still be starting, or the place being set up: try again, less often when nothing answers.
      if (code !== 'choose_entry') this.retryLater(code === 'unknown_command' ? 30_000 : 5_000);
    });
  }
  private receive(message: ViewMessage | { version: number; reload: true }): void {
    if ('reload' in message) { this.unsubscribe(); this.retryLater(2_000); return; }
    if (message.version !== VIEW_VERSION) { this.problem = 'version'; return; }
    this.problem = undefined;
    this.view = message.view;
  }
  private unsubscribe(): void {
    clearTimeout(this.retry);
    const subscription = this.subscription;
    this.subscription = undefined; this.subscribedTo = undefined;
    void subscription?.then(stop => stop()).catch(() => { /* already closed */ });
  }
  private retryLater(delay: number): void {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => this.subscribe(), delay);
  }

  protected render() {
    if (!this.config) return nothing;
    if (this.problem && !this.view) return this.renderProblem(PROBLEMS[this.problem]);
    if (!this.view) return html`<ha-card><div class="nw-wait" role="status" aria-label="Chargement de la météo"></div></ha-card>`;
    const config = this.config, view = displayed(this.view, config, this.tile);
    const sky = html`<niak-weather-sky .condition=${view.now.condition} .phase=${view.now.phase} .animated=${config.weather_animations !== false}
      .quality=${config.weather_animation_quality ?? (this.tile && LIGHT_SKY.matches ? 'low' : 'standard')} .wind=${view.now.wind ?? 0} .season=${view.season.info.season}></niak-weather-sky>`;
    const full = () => renderFull(view, { sky, uid: this.uid, entity: view.weatherEntity, station: view.station,
      show: { synthesis: config.show_synthesis !== false, today: config.show_today !== false, predictions: config.show_predictions !== false },
      folded: this.folded, onFold: id => { this.folded = { ...this.folded, [id]: !this.folded[id] }; } });
    if (!this.tile) return html`<ha-card @click=${this.openEntity} @keydown=${this.entityKey}>${full()}</ha-card>`;
    const title = `Météo${view.location ? ` · ${view.location}` : ''}`;
    return html`<ha-card>
      <div @pointerdown=${this.down} @pointermove=${this.move} @pointerup=${this.up} @pointercancel=${this.cancelPress} @pointerleave=${this.cancelPress}
        @contextmenu=${this.noMenu} @keydown=${this.tileKey}>
        ${renderTile(view, sky, { open: this.open, holdTarget: this.weatherPath ? 'page' : 'card' })}</div>
      ${this.dialogOpen ? html`<dialog class="nw-dialog" aria-label=${title} @close=${() => { this.dialogOpen = false; }} @click=${this.openEntity} @keydown=${this.entityKey}>
        <header><b>${title}</b><button type="button" @click=${this.closeDialog}>Fermer</button></header>${full()}</dialog>` : nothing}
    </ha-card>`;
  }

  private renderProblem(p: (typeof PROBLEMS)[Problem]) {
    return html`<ha-card><div class="nw-problem" role="status"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>
      <div><b>${p.title}</b><p>${p.text}</p>${p.links ? html`<div class="links">${p.links.map(([label, href], i) => html`<a class=${i ? 'second' : ''} href=${href}
        target=${href.startsWith('/') ? nothing : '_blank'} rel="noopener noreferrer" @click=${this.follow}>${label}</a>`)}</div>` : nothing}</div></div></ha-card>`;
  }
  /** A link inside Home Assistant opens there, without reloading the page. */
  private follow = (e: MouseEvent) => {
    const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
    if (!href?.startsWith('/')) return;
    e.preventDefault(); this.go(href);
  };
  private go(path: string): void {
    history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
  }

  /** The user's weather page, when one is set: a long press goes there instead of opening the full card. */
  private get weatherPath(): string | undefined {
    const path = this.config?.weather_path;
    return path?.startsWith('/') && !path.startsWith('//') ? path : undefined;
  }
  private tileCard() { return this.renderRoot.querySelector<HTMLElement>('.nw-tilecard'); }
  /** Tap: unfold or fold. Long press (½ s): the full card. Sliding cancels both. */
  private down = (e: PointerEvent) => {
    const card = this.tileCard();
    if (e.button !== 0 || !card) return;
    this.cancelPress();
    const ring = card.querySelector<HTMLElement>('.press-ring'), r = card.getBoundingClientRect(), start = performance.now();
    ring?.style.setProperty('left', `${e.clientX - r.left}px`); ring?.style.setProperty('top', `${e.clientY - r.top}px`);
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / HOLD_MS);
      ring?.style.setProperty('--p', String(p)); card.classList.toggle('pressing', p > .15);
      if (p < 1 && this.press) this.press.frame = requestAnimationFrame(tick);
    };
    this.press = { x: e.clientX, y: e.clientY, long: false, frame: requestAnimationFrame(tick),
      timer: setTimeout(() => { if (!this.press) return; this.press.long = true; this.stopRing(); this.hold(); }, HOLD_MS) };
  };
  private move = (e: PointerEvent) => { if (this.press && Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 10) this.cancelPress(); };
  private up = () => { const press = this.press; this.cancelPress(); if (press && !press.long) this.toggle(); };
  private stopRing() {
    if (!this.press) return;
    clearTimeout(this.press.timer); cancelAnimationFrame(this.press.frame);
    this.tileCard()?.classList.remove('pressing');
  }
  private cancelPress = () => { this.stopRing(); this.press = undefined; };
  /** A long press on a phone also opens the browser menu: not on the card. */
  private noMenu = (e: Event) => e.preventDefault();
  private tileKey = (e: KeyboardEvent) => {
    if (e.target !== this.tileCard() || !['Enter', ' '].includes(e.key)) return;
    e.preventDefault();
    if (e.shiftKey) this.hold(); else this.toggle();
  };
  private toggle() {
    this.open = !this.open;
    try { localStorage.setItem(this.key(), this.open ? '1' : '0'); } catch { /* private browsing */ }
  }
  private hold() {
    const path = this.weatherPath;
    if (path) { this.go(path); return; }
    this.dialogOpen = true;
  }
  private closeDialog = () => { this.renderRoot.querySelector('dialog')?.close(); };
  /** A value of the full card opens its sensor's details, like the rest of Home Assistant. */
  private openEntity = (e: Event) => {
    const target = e.composedPath().find((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-entity'));
    if (!target || target.closest('.nw-tilecard')) return;
    // Home Assistant's details window would open under ours: close ours first.
    this.closeDialog();
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: target.getAttribute('data-entity') }, bubbles: true, composed: true }));
  };
  private entityKey = (e: KeyboardEvent) => {
    if (!['Enter', ' '].includes(e.key) || !(e.target instanceof HTMLElement) || !e.target.hasAttribute('data-entity')) return;
    e.preventDefault(); this.openEntity(e);
  };

  static styles = [tokens, pieces, bubbles, tileStyles, heroStyles, fullStyles, todayStyles, forecastStyles, airStyles, css`
    :host { display:block; }
    /* Animations switched off: the alert halo stays still too, in the tile, the window and the scrolling bubble. */
    :host([still]) { --nw-motion:paused; }
    ha-card { padding:0; overflow:hidden; container-type:inline-size; }
    .nw-wait { min-height:96px; background:var(--nw-bg); }
    .nw-problem { display:flex; gap:14px; align-items:flex-start; padding:18px 20px; color:var(--nw-fg); font-size:var(--nw-fs-text); line-height:1.5; }
    .nw-problem > ha-icon { --mdc-icon-size:28px; color:var(--nw-accent); flex:none; }
    .nw-problem b { font-size:var(--nw-fs-title); }
    .nw-problem p { margin:4px 0 10px; color:var(--nw-fg2); }
    .nw-problem a { display:inline-block; padding:6px 14px; border-radius:var(--nw-radius-pill); background:var(--nw-accent); color:var(--nw-bg);
      font-weight:600; text-decoration:none; font-size:var(--nw-fs-small); }
    .nw-problem .links { display:flex; flex-wrap:wrap; gap:8px; }
    .nw-problem a.second { background:none; color:var(--nw-accent); box-shadow:inset 0 0 0 1px var(--nw-line); }
    dialog.nw-dialog { border:0; padding:0; width:min(1180px, 96vw); max-height:92vh; border-radius:16px; overflow:auto; overscroll-behavior:contain;
      background:var(--nw-bg); color:var(--nw-fg); box-shadow:0 24px 80px #0005; }
    dialog.nw-dialog::backdrop { background:#0b1520aa; backdrop-filter:blur(2px); }
    .nw-dialog > header { position:sticky; top:0; z-index:3; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px;
      background:var(--nw-bg); border-bottom:1px solid var(--nw-line-soft); font-size:var(--nw-fs-text); }
    .nw-dialog > header button { border:1px solid var(--nw-line); background:var(--nw-bg); border-radius:var(--nw-radius-pill); padding:5px 14px; cursor:pointer; font-size:var(--nw-fs-small); font-weight:600; }
    @media (max-width:600px) { dialog.nw-dialog { width:100vw; max-width:100vw; height:100dvh; max-height:100dvh; border-radius:0; margin:0; } }
    /* Full screen on a phone, the app may draw under the system bars: room to scroll the last section above them. */
    @media (max-width:600px) { dialog.nw-dialog > .nw-full { padding-bottom:calc(env(safe-area-inset-bottom, 0px) + 72px); } }
  `];
}

window.customCards = window.customCards || [];
window.customCards.push({ type: 'niak-weather-card', name: 'Niak Weather', description: 'La météo chez vous, calculée par l’intégration Niak Weather', preview: true });
declare global { interface Window { customCards: Array<Record<string, unknown>>; } }

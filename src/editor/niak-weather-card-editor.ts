import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cleanConfig } from '../config';
import type { HomeAssistant, WeatherCardConfig } from '../types';

/** The card's editor: which place, then how to show it. The sources are set in the integration. */
const defaults: Partial<WeatherCardConfig> = { format: 'full', show_synthesis: true, show_bulletin: true, show_today: true, show_predictions: true,
  collapse_today: false, collapse_predictions: false, smart_brief: true, weather_animations: true, weather_animation_quality: 'standard',
  show_atmo_details: true, show_atmo_tomorrow: true, glass_effect: true };
export const labels: Partial<Record<keyof WeatherCardConfig, string>> = {
  entry_id: 'Lieu', format: 'Format',
  weather_animations: 'Ciel animé et halos', weather_animation_quality: 'Qualité des animations', glass_effect: 'Effet verre dépoli',
  show_synthesis: 'Bandeau (synthèse et météo du moment)', show_bulletin: 'Bulletin du jour', smart_brief: 'Alertes et événements',
  show_today: 'Section Aujourd’hui', collapse_today: 'Aujourd’hui replié au départ',
  show_predictions: 'Section Prévisions', collapse_predictions: 'Prévisions repliées au départ',
  show_atmo_details: 'Détail des polluants et des pollens', show_atmo_tomorrow: 'Air et pollens de demain',
  weather_path: 'Page ouverte par un appui long',
};
/** One line under the settings that need it. */
const helpers: Partial<Record<keyof WeatherCardConfig, string>> = {
  weather_animations: 'Coupées, le ciel et les halos restent fixes.',
  weather_animation_quality: 'Allégée : moins de gouttes, de flocons et de nuages.',
  glass_effect: 'Le flou demande beaucoup de ressources : à couper sur un appareil lent. Coupé, le verre devient plus opaque.',
  smart_brief: 'La vigilance, l’alerte mesurée chez vous et la frise des événements. Coupé, la frise ne montre que le ciel prévu.',
  weather_path: 'Par exemple /meteo. Vide : l’appui long ouvre la carte complète.',
};
const SETTINGS = '/config/integrations/integration/niak_weather';

@customElement('niak-weather-card-editor')
export class NiakWeatherCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: WeatherCardConfig;
  /** The integration's places; null when the integration does not answer. */
  @state() private entries?: Array<{ entry_id: string; title: string }> | null;
  private asked = false;
  private readonly computeLabel = (item: { name: keyof WeatherCardConfig; title?: string }) =>
    item.title ?? (item.name === 'show_bulletin' && this.small ? 'Bulletin du jour, une fois dépliée' : labels[item.name] ?? item.name);
  private readonly computeHelper = (item: { name: keyof WeatherCardConfig }) => helpers[item.name] ?? '';
  private get small(): boolean { return !!this.config?.format && this.config.format !== 'full'; }

  public setConfig(config: WeatherCardConfig): void {
    const next = cleanConfig(config);
    if (this.config && JSON.stringify(next) === JSON.stringify(this.config)) return;
    this.config = next;
  }
  protected shouldUpdate(changed: Map<PropertyKey, unknown>): boolean {
    // Home Assistant pushes every state change to editors: nothing here depends on them.
    if (changed.has('hass') && !this.asked && this.hass) {
      this.asked = true;
      this.hass.callWS<Array<{ entry_id: string; title: string }>>({ type: 'niak_weather/entries' })
        .then(entries => { this.entries = entries; }, () => { this.entries = null; });
    }
    return !(changed.size === 1 && changed.has('hass'));
  }
  private changed(event: CustomEvent<{ value: Partial<WeatherCardConfig> }>): void {
    event.stopPropagation();
    if (!this.config) return;
    this.config = cleanConfig({ ...this.config, ...event.detail.value });
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
  }
  /** The place and the format on top, then folding groups: the look and its cost first, then what the card shows. */
  private schema(): unknown[] {
    const toggles = (...names: Array<keyof WeatherCardConfig>) => names.map(name => ({ name, selector: { boolean: {} } }));
    const group = (title: string, icon: string, schema: unknown[], expanded = false) => ({ type: 'expandable', name: '', title, icon, flatten: true, expanded, schema });
    const format = { name: 'format', selector: { select: { mode: 'list', options: [
      { value: 'full', label: 'Complète : la page météo' },
      { value: 'tile', label: 'Tuile : une bande qui se déplie d’un appui' },
      { value: 'intermediate', label: 'Tuile dépliée : la même, ouverte au départ' }] } } };
    const place = this.entries && this.entries.length > 1
      ? [{ name: 'entry_id', selector: { select: { options: this.entries.map(e => ({ value: e.entry_id, label: e.title })) } } }] : [];
    const look = group('Visuel et performance', 'mdi:palette-outline', [...toggles('weather_animations'),
      { name: 'weather_animation_quality', required: true, selector: { select: { mode: 'dropdown', options: [{ value: 'standard', label: 'Standard' }, { value: 'low', label: 'Allégée' }] } } },
      ...toggles('glass_effect')], true);
    // The tile unfolds on a tap and opens the full card on a long press: its own options.
    if (this.small) return [...place, format, look,
      group('Fonctionnalités', 'mdi:tune-variant', [...toggles('show_bulletin'), { name: 'weather_path', selector: { text: {} } }])];
    return [...place, format, look,
      group('Bandeau', 'mdi:view-day-outline', toggles('show_synthesis', 'show_bulletin', 'smart_brief')),
      group('Sections', 'mdi:view-agenda-outline', toggles('show_today', 'collapse_today', 'show_predictions', 'collapse_predictions')),
      group('Air et pollens', 'mdi:flower-pollen-outline', toggles('show_atmo_details', 'show_atmo_tomorrow'))];
  }
  protected render() {
    if (!this.config || !this.hass) return nothing;
    const data = Object.fromEntries(Object.entries({ ...defaults, ...this.config }).filter(([key]) => key !== 'type'));
    const one = this.entries?.length === 1 ? this.entries[0] : undefined;
    return html`
      ${this.entries === null ? html`<p class="note warn">L’intégration Niak Weather ne répond pas : la carte en a besoin depuis la version 2.0.
          Déjà téléchargée ? <a href="/config/integrations/dashboard/add?domain=niak_weather" @click=${this.follow}>Ajoutez-la</a>.
          Sinon, <a href="https://github.com/Niakman13/niak-weather-integration#installation" target="_blank" rel="noopener noreferrer">installez-la</a>.</p>`
        : this.entries?.length === 0 ? html`<p class="note warn">Ajoutez l’intégration Niak Weather : Paramètres → Appareils et services.</p>`
        : html`<p class="note">${one ? html`Lieu : <b>${one.title}</b>. ` : nothing}Les sources (prévisions, station, air et pollens) se règlent dans
          <a href=${SETTINGS} @click=${this.follow}>l’intégration Niak Weather</a>.</p>`}
      <ha-form .hass=${this.hass} .data=${data} .schema=${this.schema()} .computeLabel=${this.computeLabel} .computeHelper=${this.computeHelper} @value-changed=${this.changed}></ha-form>`;
  }
  /** A link inside Home Assistant opens there, without reloading the page. */
  private follow = (e: MouseEvent) => {
    e.preventDefault();
    history.pushState(null, '', (e.currentTarget as HTMLAnchorElement).getAttribute('href') ?? SETTINGS);
    window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
  };
  static styles = css`
    .note { color:var(--secondary-text-color); font-size:13px; line-height:1.6; margin:0 0 16px; }
    .note.warn { color:var(--primary-text-color); }
    a { color:var(--primary-color); }
  `;
}

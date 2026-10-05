import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getRegistry, stationRules, thermalFields, type RegistryContext, type SensorField } from './station-detection';
import { categoryFields, fillCategory, manualCandidates, measurementMatches, sourceDevices, sourceStatus, vigilanceCandidates, type SourceCategory } from './config-sources';
import type { HomeAssistant, WeatherCardConfig } from './types';
import { atmoAreas, atmoCandidates, atmoFields, atmoField, atmoMetrics } from './atmo';
import type { AtmoField, AtmoMetric } from './types';
export function cleanConfig(config: WeatherCardConfig): WeatherCardConfig {
  const copy = { ...config } as WeatherCardConfig & { lightning_distance_entity?: string; comfort_entity?: string; air_quality_entity?: string; model_entity?: string; forecast_entity?: string; air_path?: string };
  delete copy.lightning_distance_entity; delete copy.comfort_entity;
  delete copy.air_quality_entity; delete copy.model_entity; delete copy.forecast_entity; delete copy.air_path;
  return copy;
}
export const labels: Partial<Record<keyof WeatherCardConfig, string>> = {
  weather_entity: 'Entité météo', mode: 'Affichage', location: 'Lieu', forecast_source: 'Fournisseur des prévisions',
  smart_brief: 'Activer le brief intelligent', vigilance_entity: 'Vigilance officielle Météo-France (département)',
  show_synthesis:'Afficher la section Synthèse / météo actuelle',show_today:'Afficher la section Aujourd’hui',show_predictions:'Afficher la section Prévisions (mode complet)',
  weather_animations: 'Animer le ciel de la météo actuelle', weather_animation_quality: 'Qualité des animations météo',
  temperature_entity: 'Température extérieure', humidity_entity: 'Humidité extérieure',
  wind_speed_entity: 'Vitesse du vent (moyenne si disponible)', wind_gust_entity: 'Rafales', wind_bearing_entity: 'Direction du vent',
  rain_rate_entity: 'Intensité de pluie', daily_rain_entity: 'Pluie depuis minuit', rain_24h_entity: 'Pluie sur 24 h',
  weekly_rain_entity: 'Pluie de la semaine', monthly_rain_entity: 'Pluie du mois', yearly_rain_entity: 'Pluie de l’année', event_rain_entity: 'Pluie de l’épisode',
  pressure_entity: 'Pression (relative recommandée)', solar_radiation_entity: 'Rayonnement solaire', dew_point_entity: 'Point de rosée de la station',
  uv_index_entity: 'Indice UV', illuminance_entity: 'Luminosité', max_daily_gust_entity: 'Rafale maximale du jour', temperature_trend_entity: 'Tendance température (°C/h)',
  sun_entity: 'Soleil (lever, coucher, élévation)', sun_elevation_entity: 'Élévation solaire (capteur facultatif)',
  humidex_entity: 'Humidex', humidex_perception_entity: 'Perception de l’humidex', thermal_dew_point_entity: 'Point de rosée Thermal Comfort',
  heat_index_entity: 'Indice de chaleur', absolute_humidity_entity: 'Humidité absolue', thermal_perception_entity: 'Perception thermique / rosée',
  station_device_id: 'Appareil de la station locale', thermal_device_id: 'Appareil Thermal Comfort', weather_path: 'Page météo (appui long)',
  atmo_area: 'Commune / zone Atmo France', pollen_source: 'Source des pollens', show_atmo_details: 'Afficher les polluants, espèces et concentrations', show_atmo_tomorrow: 'Afficher les prévisions Atmo de demain',
};
for (const metric of Object.keys(atmoMetrics) as AtmoMetric[]) for (const next of [false, true])
  labels[atmoField(metric, next)] = `${atmoMetrics[metric].label}${next ? ' — demain (J+1)' : ''}`;
@customElement('niak-weather-card-editor')
export class NiakWeatherCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: WeatherCardConfig;
  @state() private registry?: RegistryContext;
  @state() private detecting = false;
  private tried = false;
  @state() private message = '';
  @state() private opened = new Set<SourceCategory>(['general', 'weather']);
  private schemaCache?: { config: WeatherCardConfig; registry?: RegistryContext; catalog: string; schemas: Record<SourceCategory, unknown[]> };
  private catalog = '';
  private registryRequest = 0;
  private readonly computeLabel = (item: { name: keyof WeatherCardConfig }) => labels[item.name] ?? item.name;
  public setConfig(config: WeatherCardConfig): void { this.config = cleanConfig(config); }
  protected updated(): void {
    if (!this.tried && this.hass && this.config) {
      this.tried = true; const request = ++this.registryRequest;
      void getRegistry(this.hass).then(r => { if (request === this.registryRequest) this.registry = r; });
    }
  }
  protected shouldUpdate(changed: Map<PropertyKey, unknown>): boolean {
    if (changed.size !== 1 || !changed.has('hass') || !this.hass) return true;
    // HA pushes every state update to editors. A new wind value must not rebuild 70 pickers.
    const catalog = Object.values(this.hass.states).map(e => `${e.entity_id}:${e.attributes.device_class ?? ''}:${e.attributes.unit_of_measurement ?? ''}:${e.attributes.friendly_name ?? ''}:${e.attributes['Nom de la zone'] ?? ''}:${e.attributes['Type de zone'] ?? ''}:${['unknown','unavailable'].includes(e.state) ? e.state : 'ok'}`).join('|');
    if (catalog === this.catalog) return false;
    this.catalog = catalog; return true;
  }
  private apply(config: WeatherCardConfig): void {
    this.config = cleanConfig(config);
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
  }
  private async detect(category: SourceCategory): Promise<void> {
    if (!this.hass || !this.config || this.detecting) return;
    this.detecting = true;
    try { ++this.registryRequest; this.registry = await getRegistry(this.hass);
      if (!this.config || !this.hass) return;
      const current = this.config, next = fillCategory(this.hass, this.registry, current, category);
      const count = Object.keys(next).filter(k => next[k as keyof WeatherCardConfig] !== current[k as keyof WeatherCardConfig]).length;
      if (count) this.apply(next);
      this.message = count ? `${count} association${count > 1 ? 's' : ''} mise${count > 1 ? 's' : ''} à jour. ${sourceStatus(this.hass, next, category)}.` : `Aucun remplacement certain. ${sourceStatus(this.hass, next, category)}. Les choix valides et les champs volontairement vidés sont conservés.`;
    } catch { this.message = 'La recherche a échoué. Vos réglages sont conservés ; réessayez ou choisissez les entités manuellement.';
    } finally { this.detecting = false; }
  }
  private valueChanged(event: CustomEvent<{ value: Partial<WeatherCardConfig> }>, category: SourceCategory): void {
    event.stopPropagation(); if (!this.config) return;
    const extras: Record<SourceCategory, string[]> = {
      general:['location','mode','smart_brief','weather_animations','weather_animation_quality','weather_path','show_synthesis','show_today','show_predictions'],
      weather:['forecast_source'],station:['station_device_id'],thermal:['thermal_device_id'],
      atmo:['atmo_area','pollen_source','show_atmo_details','show_atmo_tomorrow'],
    };
    const allowed = new Set<string>([...categoryFields[category],...extras[category]]);
    const values = Object.fromEntries(Object.entries(event.detail.value).filter(([key])=>allowed.has(key)));
    const next = { ...this.config, ...values };
    const stationChanged = next.station_device_id !== this.config.station_device_id;
    const thermalChanged = next.thermal_device_id !== this.config.thermal_device_id;
    const atmoChanged = next.atmo_area !== this.config.atmo_area;
    if (stationChanged && next.station_device_id) for (const key of Object.keys(stationRules) as SensorField[]) delete next[key];
    if (thermalChanged && next.thermal_device_id) for (const key of thermalFields) delete next[key];
    if (atmoChanged && next.atmo_area) for (const key of atmoFields) delete next[key];
    this.apply(next);
    if (stationChanged && next.station_device_id) void this.detect('station');
    else if (thermalChanged && next.thermal_device_id) void this.detect('thermal');
    else if (atmoChanged && next.atmo_area) void this.detect('atmo');
  }
  private schemas(): Record<SourceCategory, unknown[]> {
    if (this.schemaCache && this.schemaCache.config === this.config && this.schemaCache.registry === this.registry && this.schemaCache.catalog === this.catalog) return this.schemaCache.schemas;
    const registry = this.registry ?? {entities: [], devices: []};
    const sensor = (name: SensorField) => {
      const ids = manualCandidates(this.hass!, name, registry, this.config!), selected = this.config?.[name];
      if (selected && !ids.includes(selected)) ids.push(selected);
      return { name, selector: { entity: { filter: { domain: 'sensor' }, include_entities: ids } } };
    };
    const entity = (name: keyof WeatherCardConfig, domain: string, required = false) => ({ name, required, selector: { entity: { filter: { domain } } } });
    const expand = (name: string, title: string, schema: unknown[]) => ({ type: 'expandable', name, title, flatten: true, schema });
    const atmoSensor = (name: AtmoField) => {
      const ids = atmoCandidates(this.hass!, name, this.registry, this.config), selected = this.config?.[name];
      if (selected && !ids.includes(selected)) ids.push(selected);
      return { name, selector: { entity: { filter: { domain: 'sensor' }, include_entities: ids } } };
    };
    const atmoSchema = (next: boolean) => (Object.keys(atmoMetrics) as AtmoMetric[]).map(metric => atmoSensor(atmoField(metric, next)));
    const areas = atmoAreas(this.hass!, this.registry);
    const vigilanceIds = vigilanceCandidates(this.hass!, registry);
    if (this.config!.vigilance_entity && !vigilanceIds.includes(this.config!.vigilance_entity)) vigilanceIds.push(this.config!.vigilance_entity);
    if (this.config!.atmo_area && !areas.some(a => a.value === this.config!.atmo_area)) areas.push({ value: this.config!.atmo_area, label: 'Zone configurée (indisponible)' });
    const device = (name: 'station_device_id'|'thermal_device_id') => {
      const options = sourceDevices(this.hass!, registry, name === 'thermal_device_id');
      const selected = this.config![name];
      if (selected && !options.some(o => o.value === selected)) options.push({value: selected, label: 'Appareil configuré (introuvable)'});
      return {name, selector: {select: {options: [{value: '', label: 'Choix manuel des entités'}, ...options]}}};
    };
    const elevationIds = Object.values(this.hass!.states).filter(e => e.entity_id.startsWith('sensor.') && measurementMatches(e, 'sun_elevation_entity')).map(e=>e.entity_id);
    if (this.config!.sun_elevation_entity && !elevationIds.includes(this.config!.sun_elevation_entity)) elevationIds.push(this.config!.sun_elevation_entity);
    const schemas: Record<SourceCategory, unknown[]> = {
      general: [{ name: 'location', selector: { text: {} } },
      { name: 'mode', selector: { select: { options: [{ value: 'compact', label: 'Accueil (compact)' }, { value: 'detailed', label: 'Complet' }] } } },
      ...['show_synthesis','show_today','show_predictions'].map(name=>({name,selector:{boolean:{}}})),
      {name:'smart_brief',selector:{boolean:{}}}, {name:'weather_animations',selector:{boolean:{}}},
      {name:'weather_animation_quality',selector:{select:{options:[{value:'standard',label:'Standard'},{value:'low',label:'Allégée (tablette)'}]}}},
      {name:'weather_path',selector:{text:{}}}],
      weather: [entity('weather_entity','weather',true), {name:'vigilance_entity',selector:{entity:{filter:{domain:'sensor'},include_entities:vigilanceIds}}}, entity('sun_entity','sun'),
        {name:'sun_elevation_entity',selector:{entity:{filter:{domain:'sensor'},include_entities:elevationIds}}}, {name:'forecast_source',selector:{text:{}}}],
      station: [device('station_device_id'), ...Object.keys(stationRules).map(n=>sensor(n as SensorField))],
      thermal: [device('thermal_device_id'), ...thermalFields.map(sensor)],
      atmo: [
        { name: 'atmo_area', selector: { select: { options: [{ value: '', label: 'Ne pas préremplir une zone' }, ...areas] } } },
        { name: 'pollen_source', selector: { select: { options: [{ value: 'atmo', label: 'Atmo France' }, { value: 'legacy', label: 'Polleninformation' }, { value: 'none', label: 'Ne pas afficher les pollens' }] } } },
        { name: 'show_atmo_details', selector: { boolean: {} } }, { name: 'show_atmo_tomorrow', selector: { boolean: {} } },
        expand('atmo_today', 'Aujourd’hui (J) — indices et concentrations', atmoSchema(false)),
        expand('atmo_tomorrow', 'Demain (J+1) — prévisions', atmoSchema(true)),
      ],
    };
    this.schemaCache = {config:this.config!,registry:this.registry,catalog:this.catalog,schemas};
    return schemas;
  }
  protected render() {
    if (!this.config || !this.hass) return html``;
    const schemas = this.schemas();
    const sections: Array<{key:SourceCategory;title:string;description:string}> = [
      {key:'general',title:'Général',description:'Présentation, synthèse intelligente et animations. La synthèse fonctionne avec les sources disponibles ; aucune extension complémentaire n’est obligatoire.'},
      {key:'weather',title:'Sources météo, soleil et vigilance',description:'Base requise : une entité weather fournissant la météo et les prévisions. Météo-France est recommandée. Le soleil et la vigilance sont facultatifs.'},
      {key:'station',title:'Sources de la station météo locale',description:'Facultatif : enrichit la carte avec les mesures chez vous. Ecowitt, WS90 via MQTT ou autres appareils : choisissez la station, puis complétez les mesures disponibles.'},
      {key:'thermal',title:'Sources Thermal Comfort',description:'Facultatif, recommandé avec une température et une humidité extérieures : enrichit le ressenti et son explication. L’humidex provient uniquement de Thermal Comfort.'},
      {key:'atmo',title:'Sources Atmo France',description:'Facultatif, recommandé : ajoute l’air extérieur et les pollens à la synthèse et aux prévisions. Choisissez une commune ; les entités sont distinguées par mesure et par jour.'},
    ];
    return html`<p class="intro">Commencez par la météo, puis ajoutez les sources dont vous disposez. Les boutons complètent les champs manquants et réparent les références introuvables, sans remplacer vos choix valides.</p>
      <p role="status" aria-live="polite">${this.message}</p>
      ${sections.map(s=>html`<details data-category=${s.key} .open=${this.opened.has(s.key)} @toggle=${(event:Event)=>{
        const next = new Set(this.opened); (event.currentTarget as HTMLDetailsElement).open ? next.add(s.key) : next.delete(s.key);
        if (next.size !== this.opened.size) this.opened = next;
      }}><summary><strong>${s.title}</strong><span>${sourceStatus(this.hass!,this.config!,s.key)}</span></summary>
        ${this.opened.has(s.key) ? html`<div class="category-body"><p>${s.description}</p>
          <button type="button" data-fill=${s.key} ?disabled=${this.detecting} @click=${()=>this.detect(s.key)}>${this.detecting ? 'Recherche en cours…' : s.key === 'general' ? 'Compléter les réglages' : 'Remplir automatiquement'}</button>
          <ha-form data-category=${s.key} .hass=${this.hass} .data=${{show_synthesis:true,show_today:true,show_predictions:true,smart_brief:true,weather_animations:true,weather_animation_quality:'standard',show_atmo_details:true,show_atmo_tomorrow:true,...this.config}} .schema=${schemas[s.key]} .computeLabel=${this.computeLabel} @value-changed=${(event:CustomEvent<{value:Partial<WeatherCardConfig>}>)=>this.valueChanged(event,s.key)}></ha-form>
        </div>` : html``}</details>`)}`;
  }
  static styles = css`details { border:1px solid var(--divider-color,#ddd); border-radius:14px; margin:14px 0; overflow:hidden; } summary { cursor:pointer; padding:16px; display:flex; flex-direction:column; gap:5px; } summary strong { font-size:16px; } summary span { color:var(--secondary-text-color); font-size:12px; } .category-body { padding:0 16px 16px; } button { margin:4px 0 16px; padding:10px 16px; border:0; border-radius:999px; background:var(--primary-color,#03a9f4); color:var(--text-primary-color,#fff); font:inherit; cursor:pointer; } button:disabled { opacity:.6; cursor:wait; } p { color:var(--secondary-text-color); font-size:13px; line-height:1.6; } [role=status]:empty { display:none; }`;
}

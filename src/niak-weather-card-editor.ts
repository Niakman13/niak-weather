import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { candidates, detectEcowittStation, getRegistry, stationRules, thermalFields, type RegistryContext, type SensorField } from './station-detection';
import type { HomeAssistant, WeatherCardConfig } from './types';
import { sourceFields } from './local-model';
import { atmoAreas, atmoCandidates, atmoFields, atmoField, atmoMetrics } from './atmo';
import type { AtmoField, AtmoMetric } from './types';
export function cleanConfig(config: WeatherCardConfig): WeatherCardConfig {
  const copy = { ...config } as WeatherCardConfig & { lightning_distance_entity?: string; comfort_entity?: string };
  delete copy.lightning_distance_entity; delete copy.comfort_entity; return copy;
}
export const labels: Partial<Record<keyof WeatherCardConfig, string>> = {
  weather_entity: 'Entité météo', mode: 'Affichage', location: 'Lieu', forecast_source: 'Fournisseur des prévisions',
  temperature_entity: 'Température extérieure', humidity_entity: 'Humidité extérieure',
  wind_speed_entity: 'Vent moyen (10 min)', wind_gust_entity: 'Rafales', wind_bearing_entity: 'Direction du vent (10 min)',
  rain_rate_entity: 'Intensité de pluie', daily_rain_entity: 'Pluie depuis minuit', rain_24h_entity: 'Pluie sur 24 h',
  weekly_rain_entity: 'Pluie de la semaine', monthly_rain_entity: 'Pluie du mois', yearly_rain_entity: 'Pluie de l’année', event_rain_entity: 'Pluie de l’épisode',
  pressure_entity: 'Pression relative', solar_radiation_entity: 'Rayonnement solaire', dew_point_entity: 'Point de rosée de la station',
  uv_index_entity: 'Indice UV', illuminance_entity: 'Luminosité', max_daily_gust_entity: 'Rafale maximale du jour', temperature_trend_entity: 'Tendance température (°C/h)',
  sun_entity: 'Soleil (lever, coucher, élévation)', sun_elevation_entity: 'Élévation solaire (capteur facultatif)',
  humidex_entity: 'Humidex', humidex_perception_entity: 'Perception de l’humidex', thermal_dew_point_entity: 'Point de rosée Thermal Comfort',
  heat_index_entity: 'Indice de chaleur', absolute_humidity_entity: 'Humidité absolue', thermal_perception_entity: 'Perception thermique / rosée',
  model_entity: 'Capteur météo du template local (facultatif)', forecast_entity: 'Capteur de prévisions du template local (facultatif)',
  air_quality_entity: 'Indice de qualité de l’air intérieur (%)', station_device_id: 'Station Ecowitt', thermal_device_id: 'Appareil Thermal Comfort', weather_path: 'Page météo (appui long)', air_path: 'Page qualité de l’air intérieur (facultative)',
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
  public setConfig(config: WeatherCardConfig): void { this.config = cleanConfig(config); }
  protected updated(): void { if (!this.tried && this.hass && this.config) { this.tried = true; void this.detect(); } }
  private apply(config: WeatherCardConfig): void {
    this.config = cleanConfig(config);
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
  }
  private async detect(): Promise<void> {
    if (!this.hass || !this.config || this.detecting) return;
    this.detecting = true;
    try { this.registry ??= await getRegistry(this.hass); const current = this.config;
      this.apply({ ...detectEcowittStation(this.hass, this.registry, current), ...current });
    } finally { this.detecting = false; }
  }
  private valueChanged(event: CustomEvent<{ value: Partial<WeatherCardConfig> }>): void {
    event.stopPropagation(); if (!this.config) return;
    const next = { ...this.config, ...event.detail.value };
    const stationChanged = next.station_device_id !== this.config.station_device_id;
    const thermalChanged = next.thermal_device_id !== this.config.thermal_device_id;
    const atmoChanged = next.atmo_area !== this.config.atmo_area;
    const measurementChanged = Object.values(sourceFields).some(key => next[key] !== this.config![key]);
    if (measurementChanged && next.model_entity === this.config.model_entity) delete next.model_entity;
    if (next.weather_entity !== this.config.weather_entity) delete next.forecast_entity;
    if (stationChanged) { for (const key of Object.keys(stationRules) as SensorField[]) delete next[key]; delete next.model_entity; }
    if (thermalChanged || stationChanged) { for (const key of thermalFields) delete next[key]; if (stationChanged) delete next.thermal_device_id; }
    if (atmoChanged) for (const key of atmoFields) delete next[key];
    this.apply(next); if (stationChanged || thermalChanged || atmoChanged) void this.detect();
  }
  protected render() {
    if (!this.config || !this.hass) return html``;
    const sensor = (name: SensorField) => {
      const ids = candidates(this.hass!, name, this.registry, this.config), selected = this.config?.[name];
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
    const areas = atmoAreas(this.hass, this.registry);
    if (this.config.atmo_area && !areas.some(a => a.value === this.config!.atmo_area)) areas.push({ value: this.config.atmo_area, label: 'Zone configurée (indisponible)' });
    const schema = [entity('weather_entity', 'weather', true), { name: 'location', selector: { text: {} } },
      { name: 'mode', selector: { select: { options: [{ value: 'compact', label: 'Accueil (compact)' }, { value: 'detailed', label: 'Complet' }] } } },
      expand('station', 'Entités de la station', [{ name: 'station_device_id', selector: { device: { filter: { integration: 'ecowitt' } } } }, ...Object.keys(stationRules).map(n => sensor(n as SensorField))]),
      expand('thermal', 'Entités Thermal Comfort', [{ name: 'thermal_device_id', selector: { device: { filter: { integration: 'thermal_comfort' } } } }, ...thermalFields.map(sensor)]),
      expand('atmo', 'Atmo France — air extérieur et pollens', [
        { name: 'atmo_area', selector: { select: { options: [{ value: '', label: 'Ne pas préremplir une zone' }, ...areas] } } },
        { name: 'pollen_source', selector: { select: { options: [{ value: 'atmo', label: 'Atmo France' }, { value: 'legacy', label: 'Polleninformation / ancienne liste YAML' }, { value: 'none', label: 'Ne pas afficher les pollens' }] } } },
        { name: 'show_atmo_details', selector: { boolean: {} } }, { name: 'show_atmo_tomorrow', selector: { boolean: {} } },
        expand('atmo_today', 'Aujourd’hui (J) — indices et concentrations', atmoSchema(false)),
        expand('atmo_tomorrow', 'Demain (J+1) — prévisions', atmoSchema(true)),
      ]),
      expand('options', 'Soleil, air et compatibilité locale', [entity('sun_entity', 'sun'), entity('sun_elevation_entity', 'sensor'),
        entity('air_quality_entity', 'sensor'), entity('model_entity', 'sensor'), entity('forecast_entity', 'sensor'),
        { name: 'forecast_source', selector: { text: {} } }, { name: 'weather_path', selector: { text: {} } }, { name: 'air_path', selector: { text: {} } }]),
    ];
    return html`<button type="button" ?disabled=${this.detecting} @click=${this.detect}>${this.detecting ? 'Recherche des entités…' : 'Préremplir les entités manquantes'}</button>
      <p>Les choix existants sont conservés. Thermal Comfort est filtré par mesure et appareil ; Atmo France par commune, mesure et jour. Un choix ambigu reste vide. L’air intérieur (%) et l’air extérieur (indice Atmo) restent distincts. Avec un capteur de template local, ses calculs sont repris tels quels. Modifier une mesure météo repasse aux calculs intégrés.</p>
      <ha-form .hass=${this.hass} .data=${{ show_atmo_details: true, show_atmo_tomorrow: true, ...this.config }} .schema=${schema} .computeLabel=${(item: { name: keyof WeatherCardConfig }) => labels[item.name] ?? item.name} @value-changed=${this.valueChanged}></ha-form>`;
  }
  static styles = css`button { margin:0 0 8px; padding:9px 14px; border:0; border-radius:8px; background:var(--primary-color); color:var(--text-primary-color); font:inherit; cursor:pointer; } p { color:var(--secondary-text-color); font-size:12px; line-height:1.5; }`;
}

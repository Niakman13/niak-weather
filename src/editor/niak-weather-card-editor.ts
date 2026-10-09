import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getRegistry, stationRules, type RegistryContext, type SensorField } from './station-detection';
import { categoryFields, fillCategory, manualCandidates, measurementMatches, seasonCandidates, sourceDevices, sourceStatus, vigilanceCandidates, type SourceCategory } from './config-sources';
import type { HomeAssistant, WeatherCardConfig } from '../types';
import { atmoAreas, atmoCandidates, atmoFields, atmoField, atmoMetrics } from '../engine/atmo';
import { cleanConfig } from '../config';
import {modelDevices,selectedStationModel,stationGroups,stationModelOptions,stationReport} from './station-profiles';
import type { AtmoField, AtmoMetric } from '../types';
const categoryOptions:Record<SourceCategory,string[]>={
  general:['format','location','smart_brief','weather_animations','weather_animation_quality','weather_path','show_synthesis','show_bulletin','show_today','show_predictions','collapse_today','collapse_predictions'],
  weather:['forecast_source'],station:['station_device_id','station_history','station_model'],
  atmo:['atmo_area','show_atmo_details','show_atmo_tomorrow'],
};
const defaults:Partial<WeatherCardConfig>={format:'full',show_synthesis:true,show_bulletin:true,show_today:true,show_predictions:true,collapse_today:false,collapse_predictions:false,smart_brief:true,weather_animations:true,weather_animation_quality:'standard',show_atmo_details:true,show_atmo_tomorrow:true,station_history:true};
export const labels: Partial<Record<keyof WeatherCardConfig, string>> = {
  weather_entity: 'Source météo', location: 'Lieu', format: 'Format de la carte', forecast_source: 'Fournisseur des prévisions',
  smart_brief: 'Activer le brief intelligent', vigilance_entity: 'Vigilance officielle Météo-France (département)',
  show_synthesis:'Afficher la section Synthèse / météo actuelle',show_bulletin:'Afficher le bulletin du jour (prévisions par période)',show_today:'Afficher la section Aujourd’hui',show_predictions:'Afficher la section Prévisions',
  collapse_today:'Section Aujourd’hui repliée au départ',collapse_predictions:'Section Prévisions repliée au départ',
  weather_animations: 'Animations (ciel animé et halo des alertes)', weather_animation_quality: 'Qualité des animations météo',
  temperature_entity: 'Température extérieure', humidity_entity: 'Humidité extérieure',
  wind_speed_entity: 'Vitesse du vent (moyenne si disponible)', wind_gust_entity: 'Rafales', wind_bearing_entity: 'Direction du vent',
  rain_rate_entity: 'Intensité de pluie', daily_rain_entity: 'Pluie depuis minuit', rain_24h_entity: 'Pluie sur 24 h',
  rain_total_entity:'Compteur total de pluie',station_history:'Calculer les bilans de pluie depuis l’historique',
  station_model:'Modèle de votre station',
  weekly_rain_entity: 'Pluie de la semaine', monthly_rain_entity: 'Pluie du mois', yearly_rain_entity: 'Pluie de l’année', event_rain_entity: 'Pluie de l’épisode',
  pressure_entity: 'Pression (relative recommandée)', solar_radiation_entity: 'Rayonnement solaire', dew_point_entity: 'Point de rosée de la station',
  uv_index_entity: 'Indice UV', illuminance_entity: 'Luminosité', max_daily_gust_entity: 'Rafale maximale du jour', temperature_trend_entity: 'Tendance température (°C/h)',
  sun_entity: 'Soleil (lever, coucher, élévation)', season_entity: 'Saison (intégration Saison, facultatif : sinon d’après la date)', sun_elevation_entity: 'Élévation solaire (capteur complémentaire)',
  station_device_id: 'Votre station dans Home Assistant', weather_path: 'Appui long : ouvrir cette page plutôt que la carte complète (ex. /meteo, facultatif)',
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
  private schemaCache = new Map<SourceCategory,{key:string;registry?:RegistryContext;catalog:string;schema:unknown[]}>();
  private candidateCache = new Map<string,string[]>();
  private candidateRegistry?: RegistryContext;
  private candidateCatalog = '';
  private stationOptions?: Array<{value:string;label:string}>;
  private dataCache = new Map<SourceCategory,{key:string;data:Record<string,unknown>}>();
  private reportCache?:{key:string;registry?:RegistryContext;catalog:string;report:ReturnType<typeof stationReport>};
  private stationDeviceSchema:unknown[]=[];
  private stationDeviceData:Record<string,unknown>={};
  private catalog = '';
  private registryRequest = 0;
  private readonly computeLabel = (item: { name: keyof WeatherCardConfig }) =>
    item.name==='show_bulletin'&&this.small ? 'Afficher le bulletin du jour une fois dépliée (matin, après-midi, soir, nuit)' : labels[item.name] ?? item.name;
  private get small():boolean { return !!this.config?.format&&this.config.format!=='full'; }
  public setConfig(config: WeatherCardConfig): void {
    const next=cleanConfig(config);
    if(this.config&&JSON.stringify(next)===JSON.stringify(this.config))return;
    this.config=next;
  }
  protected updated(): void {
    if (!this.tried && this.hass && this.config) {
      this.tried = true; const request = ++this.registryRequest;
      void getRegistry(this.hass).then(r => { if (request === this.registryRequest) this.registry = r; });
    }
  }
  protected shouldUpdate(changed: Map<PropertyKey, unknown>): boolean {
    if (changed.size !== 1 || !changed.has('hass') || !this.hass) return true;
    // HA pushes every state update to editors. A new wind value must not rebuild 70 pickers.
    const catalog = Object.values(this.hass.states).map(e => `${e.entity_id}:${e.attributes.device_class ?? ''}:${e.attributes.state_class??''}:${e.attributes.unit_of_measurement ?? ''}:${e.attributes.friendly_name ?? ''}:${e.attributes['Nom de la zone'] ?? ''}:${e.attributes['Type de zone'] ?? ''}:${['unknown','unavailable'].includes(e.state) ? e.state : 'ok'}`).join('|');
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
      const current = this.config,search={...current};
      if(category==='station'){
        const model=selectedStationModel(current),devices=modelDevices(this.hass,this.registry,model);
        if(model!=='manual'&&!search.station_device_id){
          if(devices.length!==1){this.message=devices.length?'Plusieurs stations correspondent. Choisissez la vôtre dans « Votre station dans Home Assistant ».':'Aucun appareil de ce modèle trouvé. Vous pouvez choisir les capteurs dans les rubriques ci-dessous, ou utiliser le mode manuel.';return;}
          search.station_device_id=devices[0];
        }
        if(model==='manual')search.station_device_id='';
      }
      const filled=fillCategory(this.hass,this.registry,search,category,category==='station');
      const next=category==='station'?{...current,station_device_id:filled.station_device_id,station_model:selectedStationModel(current),...Object.fromEntries(stationGroups(selectedStationModel(current)).flatMap(g=>g.fields).filter(f=>filled[f]!==undefined).map(f=>[f,filled[f]]))}:filled;
      const count = Object.keys(next).filter(k => next[k as keyof WeatherCardConfig] !== current[k as keyof WeatherCardConfig]).length;
      if (count) this.apply(next);
      this.message = count ? `${count} champ${count > 1 ? 's' : ''} mis à jour. ${sourceStatus(this.hass, next, category)}.` : `Aucune modification. ${sourceStatus(this.hass, next, category)}.`;
    } catch { this.message = 'La recherche a échoué. Vos réglages sont conservés ; réessayez ou choisissez les entités manuellement.';
    } finally { this.detecting = false; }
  }
  private valueChanged(event: CustomEvent<{ value: Partial<WeatherCardConfig> }>, category: SourceCategory): void {
    event.stopPropagation(); if (!this.config) return;
    const allowed = new Set<string>([...categoryFields[category],...categoryOptions[category]]);
    const values = Object.fromEntries(Object.entries(event.detail.value).filter(([key])=>allowed.has(key)));
    const next = { ...this.config, ...values };
    if(category==='station')next.station_model=values.station_model as WeatherCardConfig['station_model']??selectedStationModel(this.config);
    const modelChanged=category==='station'&&selectedStationModel(next)!==selectedStationModel(this.config);
    if(modelChanged){
      if(selectedStationModel(next)==='manual')next.station_device_id='';
      else{
        for(const key of categoryFields.station)delete next[key];
        delete next.station_device_id;
        const ids=modelDevices(this.hass!,this.registry??{entities:[],devices:[]},selectedStationModel(next));
        if(ids.length===1)next.station_device_id=ids[0];
      }
      this.message='';
    }
    const stationChanged = next.station_device_id !== this.config.station_device_id;
    if(category==='station'&&!stationChanged&&!modelChanged)for(const field of categoryFields.station as SensorField[]){
      const id=next[field];
      if(id&&id!==this.config[field]&&!manualCandidates(this.hass!,field,this.registry??{entities:[],devices:[]},{...next,station_device_id:selectedStationModel(next)==='manual'?undefined:next.station_device_id}).includes(id)){
        next[field]=this.config[field];this.message=`${labels[field]} : ce capteur n’a pas la fonction ou l’unité attendue.`;
      }
    }
    const atmoChanged = next.atmo_area !== this.config.atmo_area;
    if (stationChanged && next.station_device_id) for (const key of Object.keys(stationRules) as SensorField[]) delete next[key];
    if (atmoChanged && next.atmo_area) for (const key of atmoFields) delete next[key];
    this.apply(next);
    if ((stationChanged||modelChanged) && next.station_device_id) void this.detect('station');
    else if (atmoChanged && next.atmo_area) void this.detect('atmo');
  }
  private formData(category:SourceCategory):Record<string,unknown>{
    const names=[...categoryFields[category],...categoryOptions[category]];
    const data=Object.fromEntries(names.map(name=>[name,this.config![name as keyof WeatherCardConfig]??(name==='station_model'?selectedStationModel(this.config!):defaults[name as keyof WeatherCardConfig])]).filter(([,value])=>value!==undefined));
    const key=JSON.stringify(data),cached=this.dataCache.get(category);
    if(cached?.key===key)return cached.data;
    this.dataCache.set(category,{key,data});return data;
  }
  private schemas(category: SourceCategory): unknown[] {
    const dependencies=[...categoryFields[category],...(category==='station'?['station_device_id','station_model']:category==='atmo'?['atmo_area']:category==='general'?['format']:[])];
    const key=JSON.stringify(dependencies.map(name=>this.config![name as keyof WeatherCardConfig]));
    const cached=this.schemaCache.get(category);
    if(cached&&cached.key===key&&cached.registry===this.registry&&cached.catalog===this.catalog)return cached.schema;
    if(this.candidateRegistry!==this.registry||this.candidateCatalog!==this.catalog){
      this.candidateCache.clear();this.stationOptions=undefined;this.candidateRegistry=this.registry;this.candidateCatalog=this.catalog;
    }
    const registry = this.registry ?? {entities: [], devices: []};
    const sensor = (name: SensorField) => {
      const scope=selectedStationModel(this.config!)==='manual'?undefined:this.config!.station_device_id;
      const cacheKey=JSON.stringify([name,scope]);
      let candidates=this.candidateCache.get(cacheKey);
      if(!candidates){candidates=manualCandidates(this.hass!,name,registry,{...this.config,station_device_id:scope});this.candidateCache.set(cacheKey,candidates);}
      const ids=[...candidates],selected=this.config?.[name];
      if (selected && !ids.includes(selected)) ids.push(selected);
      return { name, selector: { entity: { filter: { domain: 'sensor' }, include_entities: ids } } };
    };
    const entity = (name: keyof WeatherCardConfig, domain: string, required = false) => ({ name, required, selector: { entity: { filter: { domain } } } });
    const expand = (name: string, title: string, schema: unknown[]) => ({ type: 'expandable', name, title, flatten: true, schema });
    const atmoSensor = (name: AtmoField) => {
      const cacheKey=JSON.stringify([name,this.config!.atmo_area]);
      let candidates=this.candidateCache.get(cacheKey);
      if(!candidates){candidates=atmoCandidates(this.hass!,name,this.registry,this.config);this.candidateCache.set(cacheKey,candidates);}
      const ids=[...candidates],selected=this.config?.[name];
      if (selected && !ids.includes(selected)) ids.push(selected);
      return { name, selector: { entity: { filter: { domain: 'sensor' }, include_entities: ids } } };
    };
    const atmoSchema = (next: boolean) => (Object.keys(atmoMetrics) as AtmoMetric[]).map(metric => atmoSensor(atmoField(metric, next)));
    const device = (name: 'station_device_id') => {
      this.stationOptions??=sourceDevices(this.hass!,registry);
      const model=selectedStationModel(this.config!),matches=modelDevices(this.hass!,registry,model);
      const options=matches.length?this.stationOptions.filter(o=>matches.includes(o.value)):[...this.stationOptions];
      const selected = this.config![name];
      if (selected && !options.some(o => o.value === selected)) options.push({value: selected, label: 'Appareil configuré (introuvable)'});
      return {name, selector: {select: {options: [{value: '', label: 'Sélectionner votre appareil'}, ...options]}}};
    };
    const schemas: Record<SourceCategory, ()=>unknown[]> = {
      general: ()=>{
        const format=this.config!.format??'full',animation=[{name:'weather_animations',selector:{boolean:{}}},
          {name:'weather_animation_quality',selector:{select:{options:[{value:'standard',label:'Standard'},{value:'low',label:'Allégée (tablette, vieux téléphone)'}]}}}];
        const choice={name:'format',selector:{select:{mode:'list',options:[{value:'full',label:'Complète : la page météo (Synthèse, Aujourd’hui, Prévisions)'},
          {value:'tile',label:'Tuile : une bande qui se déplie d’un appui, pleine ou demi-largeur'},{value:'intermediate',label:'Tuile dépliée : la même tuile, ouverte au départ'}]}}};
        // The tile unfolds on a tap and opens the full card on a long press: its own options, the same sources.
        if(format!=='full')return [choice,{name:'location',selector:{text:{}}},{name:'show_bulletin',selector:{boolean:{}}},...animation,{name:'weather_path',selector:{text:{}}}];
        return [choice,{ name: 'location', selector: { text: {} } },
      ...['show_synthesis','show_bulletin','show_today','show_predictions','collapse_today','collapse_predictions'].map(name=>({name,selector:{boolean:{}}})),
      {name:'smart_brief',selector:{boolean:{}}},...animation];},
      weather: ()=>{
        const vigilanceIds=vigilanceCandidates(this.hass!,registry);
        if(this.config!.vigilance_entity&&!vigilanceIds.includes(this.config!.vigilance_entity))vigilanceIds.push(this.config!.vigilance_entity);
        const seasonIds=seasonCandidates(this.hass!,registry);
        if(this.config!.season_entity&&!seasonIds.includes(this.config!.season_entity))seasonIds.push(this.config!.season_entity);
        const elevationIds=Object.values(this.hass!.states).filter(e=>e.entity_id.startsWith('sensor.')&&measurementMatches(e,'sun_elevation_entity')).map(e=>e.entity_id);
        if(this.config!.sun_elevation_entity&&!elevationIds.includes(this.config!.sun_elevation_entity))elevationIds.push(this.config!.sun_elevation_entity);
        return [entity('weather_entity','weather',true), {name:'vigilance_entity',selector:{entity:{filter:{domain:'sensor'},include_entities:vigilanceIds}}}, entity('sun_entity','sun'),
        {name:'sun_elevation_entity',selector:{entity:{filter:{domain:'sensor'},include_entities:elevationIds}}}, {name:'season_entity',selector:{entity:{filter:{domain:'sensor'},include_entities:seasonIds}}}, {name:'forecast_source',selector:{text:{}}}];
      },
      station: ()=>{
        const model=selectedStationModel(this.config!);
        this.stationDeviceSchema=[{name:'station_model',selector:{select:{options:stationModelOptions}}},...(model==='manual'?[]:[device('station_device_id')])];
        return stationGroups(model).map(group=>expand(group.name,group.title,[...group.fields.map(sensor),...(group.name==='station_rain'&&model!=='gw2000a'?[{name:'station_history',selector:{boolean:{}}}]:[])]));
      },
      atmo: ()=>{
        const areas=atmoAreas(this.hass!,this.registry);
        if(this.config!.atmo_area&&!areas.some(a=>a.value===this.config!.atmo_area))areas.push({value:this.config!.atmo_area,label:'Zone configurée (indisponible)'});
        return [
        { name: 'atmo_area', selector: { select: { options: [{ value: '', label: 'Ne pas préremplir une zone' }, ...areas] } } },
        { name: 'show_atmo_details', selector: { boolean: {} } }, { name: 'show_atmo_tomorrow', selector: { boolean: {} } },
        expand('atmo_today', 'Aujourd’hui (J) — indices et concentrations', atmoSchema(false)),
        expand('atmo_tomorrow', 'Demain (J+1) — prévisions', atmoSchema(true)),
      ];},
    };
    const schema=schemas[category]();
    this.schemaCache.set(category,{key,registry:this.registry,catalog:this.catalog,schema});
    return schema;
  }
  protected render() {
    if (!this.config || !this.hass) return html``;
    const sections: Array<{key:SourceCategory;title:string;description:string}> = [
      {key:'general',title:'Général',description:this.small?'La tuile résume la météo sur une page d’accueil. Un appui la déplie avec le bulletin et les prévisions ; un appui long ouvre la carte complète.':'Choisissez le format, puis les sections affichées, leur état de départ, la synthèse et les animations.'},
      {key:'weather',title:'Sources météo, soleil et vigilance',description:'Indispensable : fournit la météo actuelle et les prévisions, idéalement avec Météo-France. Le soleil affine le ressenti et la vigilance ajoute les alertes officielles.'},
      {key:'station',title:'Capteurs locaux / station météo locale',description:'Conseillé : ajoute les mesures prises chez vous. Choisissez le modèle de votre station, puis vérifiez les capteurs préremplis. Avec l’humidité extérieure, la carte calcule elle-même l’humidex, le point de rosée et le point de gelée.'},
      {key:'atmo',title:'Sources Atmo France',description:'Conseillé : ajoute la qualité de l’air et les pollens de votre commune, aujourd’hui et demain. Ces informations enrichissent la synthèse.'},
    ];
    const model=selectedStationModel(this.config),modelFields=stationGroups(model).flatMap(g=>g.fields);
    const reportKey=JSON.stringify([model,this.config.station_device_id,...categoryFields.station.map(f=>this.config![f])]);
    if(this.opened.has('station')&&(!this.reportCache||this.reportCache.key!==reportKey||this.reportCache.registry!==this.registry||this.reportCache.catalog!==this.catalog))this.reportCache={key:reportKey,registry:this.registry,catalog:this.catalog,report:stationReport(this.hass,this.registry??{entities:[],devices:[]},this.config)};
    const report=this.opened.has('station')?this.reportCache?.report:undefined;
    const issues=report?.fields.filter(f=>modelFields.includes(f.field)&&(f.status==='invalid'||f.status==='ambiguous'&&!this.config![f.field]))??[];
    const configured=modelFields.filter(f=>!!this.config![f]).length;
    if(this.opened.has('station')){this.schemas('station');if(this.stationDeviceData.station_device_id!==this.config.station_device_id||this.stationDeviceData.station_model!==model)this.stationDeviceData={station_model:model,station_device_id:this.config.station_device_id};}
    return html`<p class="intro">Choisissez votre météo, puis ajoutez les sources dont vous disposez. Utilisez « Remplir automatiquement » pour vous aider à sélectionner les capteurs.</p>
      <p role="status" aria-live="polite">${this.message}</p>
      ${sections.map(s=>html`<details data-category=${s.key} .open=${this.opened.has(s.key)} @toggle=${(event:Event)=>{
        const next = new Set(this.opened); (event.currentTarget as HTMLDetailsElement).open ? next.add(s.key) : next.delete(s.key);
        if (next.size !== this.opened.size) this.opened = next;
      }}><summary><strong>${s.title}</strong><span>${sourceStatus(this.hass!,this.config!,s.key)}</span></summary>
        ${this.opened.has(s.key) ? html`<div class="category-body"><p>${s.description}</p>
          ${s.key==='station'?html`<ha-form data-category="station-device" .hass=${this.hass} .data=${this.stationDeviceData} .schema=${this.stationDeviceSchema} .computeLabel=${this.computeLabel} @value-changed=${(event:CustomEvent<{value:Partial<WeatherCardConfig>}>)=>this.valueChanged(event,'station')}></ha-form>`:html``}
          ${s.key==='station'?html`<p class="station-help">${model==='gw2000a'?'Votre station fournit les compteurs de pluie par période.':model==='ws90'?'Un compteur total permet de calculer la pluie du jour, de la semaine, du mois et de l’année.':'Renseignez les capteurs disponibles. Un compteur total permet de calculer les bilans de pluie.'}${configured&&model!=='manual'?' Changer de modèle remplace les sources de la station ; les autres réglages sont conservés.':''}</p>`:html``}
          <button type="button" data-fill=${s.key} ?disabled=${this.detecting} @click=${()=>this.detect(s.key)}>${this.detecting ? 'Recherche en cours…' : s.key === 'general' ? 'Compléter les réglages' : 'Remplir automatiquement'}</button>
          ${s.key==='station'?html`<div class="station-report" role="status"><p>${configured?`${configured} capteur${configured>1?'s':''} renseigné${configured>1?'s':''}.`:'Aucun capteur renseigné. Utilisez « Remplir automatiquement » ou les rubriques ci-dessous.'}</p>${issues.length?html`<details><summary>${issues.length} choix à vérifier</summary><ul>${issues.map(f=>html`<li><strong>${labels[f.field]}</strong><span>${f.status==='ambiguous'?'Plusieurs capteurs possibles : sélectionnez celui à utiliser.':'Le capteur choisi ne correspond pas à cette mesure.'}</span></li>`)}</ul></details>`:html``}</div>`:html``}
          <ha-form data-category=${s.key} .hass=${this.hass} .data=${this.formData(s.key)} .schema=${this.schemas(s.key)} .computeLabel=${this.computeLabel} @value-changed=${(event:CustomEvent<{value:Partial<WeatherCardConfig>}>)=>this.valueChanged(event,s.key)}></ha-form>
        </div>` : html``}</details>`)}`;
  }
  static styles = css`details { border:1px solid var(--divider-color,#ddd); border-radius:14px; margin:14px 0; overflow:hidden; } summary { cursor:pointer; padding:16px; display:flex; flex-direction:column; gap:5px; } summary strong { font-size:16px; } summary span { color:var(--secondary-text-color); font-size:12px; } .category-body { padding:0 16px 16px; } button { margin:4px 0 16px; padding:10px 16px; border:0; border-radius:999px; background:var(--primary-color,#03a9f4); color:var(--text-primary-color,#fff); font:inherit; cursor:pointer; } button:disabled { opacity:.6; cursor:wait; } p { color:var(--secondary-text-color); font-size:13px; line-height:1.6; } [role=status]:empty { display:none; }`;
}

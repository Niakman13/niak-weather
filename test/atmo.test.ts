import { describe, it, expect } from 'vitest';
import { atmoAreas, atmoCandidates, atmoField, atmoFields, atmoMetrics, atmoReading, detectAtmo } from '../src/atmo';
import { detectEcowittStation } from '../src/station-detection';
import { usesAtmoPollens } from '../src/atmo-view';
import type { AtmoMetric, HassEntity, HomeAssistantEntityRegistryEntry, WeatherCardConfig } from '../src/types';

function fixture(city = 'Ma commune', entry = 'a') {
  const states: Record<string, HassEntity> = {}, entities: HomeAssistantEntityRegistryEntry[] = [];
  for (const next of [false, true]) for (const metric of Object.keys(atmoMetrics) as AtmoMetric[]) {
    const id = `sensor.${entry}_${metric}${next ? '_j_1' : ''}`, concentration = metric.endsWith('_concentration');
    const label = metric === 'air' ? 'Qualité globale' : metric === 'pollen' ? 'Qualité globale Pollen'
      : metric === 'pm25' ? 'PM25' : metric === 'pm10' ? 'PM10' : metric === 'no2' ? "Dioxyde d’azote"
      : metric === 'o3' ? 'Ozone' : metric === 'so2' ? 'Dioxyde de soufre' : atmoMetrics[metric].label;
    states[id] = { entity_id:id, state: concentration ? '1.4' : '1', attributes: { attribution:'Atmo France-AtmoSud',
      'Nom de la zone':city, 'Type de zone':'Commune', friendly_name:'Entité renommée', ...(concentration ? {unit_of_measurement:'µg/m³'} : {}) } };
    entities.push({entity_id:id, platform:'atmofrance', device_id: metric.includes('pollen') || !['air','pm25','pm10','no2','o3','so2'].includes(metric) ? `pollen-${entry}` : `air-${entry}`,
      config_entry_id:entry, original_name:`${label}-${city}${next ? '-J+1' : ''}`, unique_id:`${entry}-12345-${label}${next ? '-J+1' : ''}` });
  }
  return { states, context:{entities,devices:[]} };
}
describe('Atmo France source contract and discovery', () => {
  it('recognises all 38 entities, including renamed entities, J+1 and concentrations', () => {
    const {states,context} = fixture(), result = detectAtmo({states}, context);
    expect(atmoFields).toHaveLength(38);
    for (const field of atmoFields) expect(result[field], field).toBeDefined();
    expect(result).toMatchObject({atmo_area:'zone:commune:ma commune',pollen_source:'atmo',atmo_air_entity:'sensor.a_air',atmo_air_tomorrow_entity:'sensor.a_air_j_1',atmo_grass_concentration_entity:'sensor.a_grass_concentration'});
  });
  it('groups pollution and pollen devices by zone; no random first city', () => {
    const a=fixture('Paris','a'),b=fixture('Lyon','b'),states={...a.states,...b.states},context={devices:[],entities:[...a.context.entities,...b.context.entities]};
    expect(atmoAreas({states},context)).toHaveLength(2);
    expect(detectAtmo({states},context)).toEqual({});
    expect(detectAtmo({states},context,{location:'Lyon'}).atmo_air_entity).toBe('sensor.b_air');
    expect(atmoCandidates({states},'atmo_air_entity',context,{atmo_area:'zone:commune:lyon'})).toEqual(['sensor.b_air']);
  });
  it('preserves manual choices, explicitly cleared fields and disabled prefill', () => {
    const {states,context}=fixture();
    expect(detectAtmo({states},context,{atmo_air_entity:'sensor.manual',atmo_grass_entity:''})).not.toHaveProperty('atmo_air_entity');
    expect(detectAtmo({states},context,{atmo_grass_entity:''})).not.toHaveProperty('atmo_grass_entity');
    expect(detectAtmo({states},context,{atmo_area:''})).toEqual({});
    expect(detectAtmo({states},context,{pollen_source:'none'})).not.toHaveProperty('pollen_source');
  });
  it('does not mix unrelated AQI, indoor pollutants or legacy pollen levels', () => {
    const states = { 'sensor.indoor_pm25':{entity_id:'sensor.indoor_pm25',state:'12',attributes:{device_class:'pm25',unit_of_measurement:'µg/m³'}},
      'sensor.polleninformation_city_grasses':{entity_id:'sensor.polleninformation_city_grasses',state:'3',attributes:{}},
      'sensor.qualite_globale':{entity_id:'sensor.qualite_globale',state:'4',attributes:{}} };
    expect(atmoCandidates({states},'atmo_pm25_entity')).toEqual([]);
    expect(detectAtmo({states})).toEqual({});
    expect(detectEcowittStation({states}).pollens).toBeUndefined();
    expect(detectEcowittStation({states},undefined,{pollen_source:'legacy'}).pollens).toHaveLength(1);
  });
  it('survives denied registry access using attribution and geographic attributes', () => {
    const {states,context}=fixture();
    for (const e of Object.values(states)) e.attributes.friendly_name=context.entities.find(r=>r.entity_id===e.entity_id)?.original_name;
    expect(detectAtmo({states}).atmo_air_entity).toBe('sensor.a_air');
    expect(detectAtmo({states},context).atmo_area).toBe(detectAtmo({states}).atmo_area);
  });
  it('does not choose duplicate sensors for one metric or a disabled entity', () => {
    const {states,context}=fixture();
    states['sensor.duplicate']={...states['sensor.a_air'],entity_id:'sensor.duplicate'};
    context.entities.push({...context.entities.find(r=>r.entity_id==='sensor.a_air'),entity_id:'sensor.duplicate'});
    expect(detectAtmo({states},context).atmo_air_entity).toBeUndefined();
    context.entities.at(-1)!.disabled_by='user';
    expect(detectAtmo({states},context).atmo_air_entity).toBe('sensor.a_air');
  });
});
describe('Atmo display semantics', () => {
  const now=new Date('2026-10-04T10:00:00Z');
  const hass=(value:string,attributes:Record<string,unknown>={})=>({states:{'sensor.test':{entity_id:'sensor.test',state:value,attributes}},config:{time_zone:'Europe/Paris'}});
  it('never maps 0 to no allergens, and preserves all six Atmo pollen levels', () => {
    expect(atmoReading(hass('0'),'sensor.test',true, false,now)).toMatchObject({label:'Indisponible',value:undefined});
    expect(atmoReading(hass('1'),'sensor.test',true,false,now)?.label).toBe('Très faible');
    expect(atmoReading(hass('2'),'sensor.test',true,false,now)?.label).toBe('Faible');
    expect(atmoReading(hass('6'),'sensor.test',true,false,now)?.label).toBe('Extrêmement élevé');
    expect(atmoReading(hass('7'),'sensor.test',false,false,now)?.label).toBe('Événement');
  });
  it('does not treat pollutant concentration as an Atmo index or invent missing data', () => {
    expect(atmoReading(hass('4',{unit_of_measurement:'µg/m³'}),'sensor.test',false,false,now)?.value).toBeUndefined();
    for (const value of ['unknown','unavailable','', '1.2','9','-1']) expect(atmoReading(hass(value),'sensor.test',true,false,now)?.value).toBeUndefined();
    expect(atmoReading({states:{}},'sensor.deleted',false,false,now)?.label).toBe('Indisponible');
    expect(atmoReading(hass('0',{unit_of_measurement:'µg/m³'}),'sensor.test',true,true,now)).toMatchObject({value:0,unit:'µg/m³'});
  });
  it('keeps upstream labels, only safe hex colours, timezone and publication freshness', () => {
    const attrs={'Libellé':'Élevé','Couleur':'#ff5050','Date de mise à jour':'2026-10-03T12:00:00','Nom de la zone':'Ma commune'};
    expect(atmoReading(hass('4',attrs),'sensor.test',true,false,now)).toMatchObject({label:'Élevé',color:'#ff5050',updated:'03/10 14:00',stale:false});
    expect(atmoReading(hass('4',{...attrs,'Couleur':'red;display:none','Date de mise à jour':'2026-09-01'}),'sensor.test',true,false,now)).toMatchObject({color:'#ff5050',stale:true});
    expect(atmoReading(hass('4',{'Date de mise à jour':'unknown'}),'sensor.test',true,false,now)?.updated).toBe('');
  });
  it('suppresses the old pollen list only when Atmo or none is selected, without overwriting it', () => {
    const config:WeatherCardConfig={type:'custom:niak-weather-card',weather_entity:'weather.test',pollens:[{id:'sensor.old',nom:'Ancien'}]};
    expect(usesAtmoPollens(config)).toBe(false);
    expect(usesAtmoPollens({...config,atmo_pollen_entity:'sensor.atmo'})).toBe(true);
    expect(usesAtmoPollens({...config,atmo_pollen_entity:'sensor.atmo',pollen_source:'legacy'})).toBe(false);
    expect(atmoField('grass_concentration',true)).toBe('atmo_grass_concentration_tomorrow_entity');
  });
});

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import * as mdi from '@mdi/js';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';

const reference = JSON.parse(readFileSync('reference/local-renderer.json'));
const fixtures = JSON.parse(readFileSync('reference/model-fixtures.json'));
const out = 'test-results'; mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  if (req.url === '/card.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(readFileSync('dist/niak-weather-card.js')); }
  else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Niak Weather parity</title></head><body><header><h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">Aperçu météo</h1></header><main aria-label="Aperçu météo"></main></body></html>'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
const reports = [];
try {
  for (const dark of [false, true]) for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1300 }); await page.goto(origin);
    await page.evaluate(async ({ reference, fixture, icons, dark }) => {
      const theme = `display:block;border-radius:20px;background:var(--card-background-color);border:1px solid rgba(150,150,150,.2);box-shadow:0 8px 24px rgba(0,0,0,.12);overflow:hidden;container-type:inline-size;padding:0;box-sizing:border-box;`;
      document.head.insertAdjacentHTML('beforeend', `<style>:root {--primary-text-color:${dark ? '#e4e4e4' : '#20203f'};--secondary-text-color:${dark ? '#aaa' : '#686878'};--card-background-color:${dark ? '#242424' : '#fff4f4'};--primary-color:#3d9be9;}body{margin:0;padding:12px;font:14px/1.5 Roboto,Arial,sans-serif;background:${dark ? '#171717' : '#eee7e7'};color:var(--primary-text-color)}#baseline{${theme}}#baseline #container{display:grid;grid-template-areas:"heros" "essentiels" "sect1" "tuiles" "pastilles" "sect2" "courbe" "jours" "sect3" "bilan";gap:0;min-width:0;}#baseline [data-entity]:focus-visible {outline:2px solid var(--primary-color)}${reference.css}</style>`);
      customElements.define('ha-icon', class extends HTMLElement {
        connectedCallback() {
          if (this.shadowRoot) return;
          const key = 'mdi' + (this.getAttribute('icon')?.split(':')[1] ?? '').split('-').map(s => s[0]?.toUpperCase() + s.slice(1)).join('');
          const path = icons[key]; this.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{display:inline-flex;vertical-align:middle;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);flex-shrink:0}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path ?? ''}"></path></svg>`;
        }
      });
      customElements.define('ha-card', class extends HTMLElement { connectedCallback() {
        if (this.shadowRoot) return;
        this.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{${theme}}</style><slot></slot>`;
      } });
      customElements.define('ha-form', class extends HTMLElement {});
      const A = { ...fixture.expected, ressenti:21.2, t_ext:20.8, humidex:22.9, effet_vent:-1.9, effet_soleil:.2, effet_pluie:0, effet_nuit:0,
        titre:'Éclaircies', sous_titre:'légère brise', phrase_ressenti:'le ressenti colle au thermomètre', niveau:'optimise', alerte:'', condition:'partlycloudy', cond_source:'prevision',
        vent:6.54, rafales:22.3, vent_deg:225, vent_rose:'SO', vent_secteur:'Sud-Ouest', beaufort:2, beaufort_tx:'légère brise',
        pluie_jour:0, pluie_taux:0, pluie_dans:-1, pluie_mm:0, tend_temp:2.2, baro:{d:.6,f:180,s:'stable',tx:'temps installé'},
        vent_t:{d:3,f:60,s:'hausse',tx:'vent régulier'}, uv:0, uv_tx:'faible', solaire:70.89, lux:8973.4, hr_ext:56 };
      const heures = Array.from({ length:18 }, (_, i) => ({ h:(10+i)%24,j:Math.floor((10+i)/24),t:21+6*Math.sin(i/5),p:0,c:'partlycloudy' }));
      const jours = [27,26,26,20,21,17,20].map((t,i)=>({n:['DIM','LUN','MAR','MER','JEU','VEN','SAM'][i],e:i,t,m:[17,16,16,16,13,7,6][i],p:[0,.4,0,43.8,1.6,0,0][i],c:i===3?'lightning-rainy':i>4?'sunny':'partlycloudy'}));
      const variables = { ent:'sensor.model',ent_prev:'sensor.prev',ent_air:'sensor.air',lieu:'Ma commune',source_prev:'Météo-France',pollens:[{id:'sensor.grasses',nom:'Graminées',ico:'mdi:grass'}] };
      const states = { 'sensor.model':{entity_id:'sensor.model',state:'21.2',attributes:A}, 'sensor.prev':{entity_id:'sensor.prev',state:'18',attributes:{heures,jours}},
        'weather.test':{entity_id:'weather.test',state:'partlycloudy',attributes:{friendly_name:'Ma commune',attribution:'Météo-France'}},
        'sensor.air':{entity_id:'sensor.air',state:'94',attributes:{}}, 'sensor.grasses':{entity_id:'sensor.grasses',state:'low',attributes:{}} };
      const order = ['heros','essentiels','sect1','tuiles','pastilles','sect2','courbe','jours','sect3','bilan'];
      const baseline = document.createElement('div'); baseline.id='baseline';
      const fields = Object.fromEntries(Object.entries(reference.fields).map(([k,code]) => [k,new Function('variables','states','hass',code)]));
      const rendered = {}; for (const k of Object.keys(reference.fields)) rendered[k] = fields[k](variables,states,{});
      baseline.innerHTML = `<div id="container">${order.map(k=>`<div style="grid-area:${k}" id="${k}">${rendered[k]}</div>`).join('')}</div>`;
      document.querySelector('main').append(baseline);
      window.fixture = { states, config:{type:'custom:niak-weather-card',weather_entity:'weather.test',smart_brief:false,model_entity:'sensor.model',forecast_entity:'sensor.prev',air_quality_entity:'sensor.air',pollens:variables.pollens,location:'Ma commune',forecast_source:'Météo-France',mode:'detailed'} };
      await import('/card.js');
    }, { reference, fixture: fixtures[0], icons: mdi, dark });
    const baseline = await page.locator('#baseline').screenshot({ path:`${out}/original-${width}-${dark?'dark':'light'}.png`, animations:'disabled' });
    await page.evaluate(() => {
      document.querySelector('#baseline').remove(); const card = document.createElement('niak-weather-card');
      card.setConfig(window.fixture.config); card.hass = { states:window.fixture.states,language:'fr',config:{time_zone:'Europe/Paris'},callWS:async()=>({}) };
      document.querySelector('main').append(card); window.card=card;
    });
    await page.locator('niak-weather-card .me-bl').first().waitFor();
    const actual = await page.locator('niak-weather-card').screenshot({ path:`${out}/niak-${width}-${dark?'dark':'light'}.png`,animations:'disabled' });
    const a = PNG.sync.read(baseline), b=PNG.sync.read(actual);
    assert.equal(b.width,a.width, 'card width');
    const layout=await page.evaluate(()=>{
      const root=window.card.shadowRoot, host=window.card.getBoundingClientRect();
      const sections=[...root.querySelectorAll('#container>.nw-section')].map(s=>s.querySelector('h2').textContent);
      const tiles=[...root.querySelectorAll('.me-tu')].map(s=>s.querySelector('.nw-metric-name').textContent);
      const order=root.querySelector('#comfort').getBoundingClientRect().top<root.querySelector('#tuiles').getBoundingClientRect().top;
      const overflow=[...root.querySelectorAll('.nw-section,.me-tu,.me-bl,.me-graph,.me-j')].some(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left<host.left-1||r.right>host.right+1)});
      return {sections,tiles,order,overflow};
    });
    assert.deepEqual(layout.sections,['Synthèse','Aujourd’hui','Prévisions']);
    assert.deepEqual(layout.tiles,['Température','Vent','Pluie','Pression']);
    assert.equal(layout.order,true);assert.equal(layout.overflow,false);
    const events=[]; await page.evaluate(()=>{window.info=[];window.card.addEventListener('hass-more-info',e=>window.info.push(e.detail.entityId));});
    await page.locator('niak-weather-card .me-tu').nth(1).click();
    assert.equal(await page.evaluate(()=>window.info[0]),'sensor.vent');
    await page.locator('niak-weather-card .me-tu').first().focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.info[1]),'sensor.t_ext');
    const axe=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();
    assert.deepEqual(axe.violations.map(v=>v.id),[], 'automated structural accessibility');
    reports.push({width,dark,height:b.height,geometry:'three-section redesign; no approved visual baseline yet',layout,interactions:'mouse + keyboard passed',accessibility:'structural scan passed; contrast inherited from HA theme'});
  }
  // Lifecycle and editor behavior use the actual bundled elements, not rewritten mocks of their logic.
  const behavior = await page.evaluate(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const root = document.querySelector('main'); root.replaceChildren();
    const weather = id => ({ entity_id:id,state:'partlycloudy',attributes:{friendly_name:id,temperature:20,temperature_unit:'°C'} });
    const states = { 'weather.a':weather('weather.a'),'weather.b':weather('weather.b') };
    const forecast = [{datetime:'2026-10-04T10:00:00Z',temperature:20},{datetime:'2026-10-04T11:00:00Z',temperature:22},{datetime:'2026-10-04T12:00:00Z',temperature:21}];
    const card = document.createElement('niak-weather-card');
    const requests=[];
    card.hass = {states,language:'fr',callWS:async message => {
      requests.push(message);
      if (message.service_data?.type === 'daily') throw new Error('daily unsupported');
      return { response:{ [message.target.entity_id]:{forecast} } };
    } };
    card.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.a'});root.append(card);await sleep(60);
    const partial = !!card.shadowRoot.querySelector('.me-courbe') && !card.shadowRoot.querySelector('.me-jours');
    const stateBefore = card.shadowRoot.textContent;
    const release=[];
    card.hass = {states,language:'fr',callWS:message => new Promise(resolve=> {
      if (message.target.entity_id==='weather.a') release.push(()=>resolve({ response:{'weather.a':{forecast:forecast.map(p=>({...p,temperature:99}))} } }));
      else resolve({response:{'weather.b':{forecast}}});
    }) };
    card.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.a'});await sleep(20);
    card.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.b'});await sleep(30);release.forEach(resolve=>resolve());await sleep(30);
    const race = !card.shadowRoot.textContent.includes('99°') && card.shadowRoot.textContent.includes('weather.b');
    card.remove();
    const sensor=(id,state,attributes={})=>({entity_id:id,state,attributes});
    const editorStates = {
      ...states, 'sensor.outdoor_temperature':sensor('sensor.outdoor_temperature','20'),
      'sensor.outdoor_humidity':sensor('sensor.outdoor_humidity','60'),
      'sensor.renamed':sensor('sensor.renamed','23',{temperature:20,humidity:60}),
      'sensor.renamed_sensation':sensor('sensor.renamed_sensation','comfortable'),
      'sensor.inside':sensor('sensor.inside','25',{temperature:25,humidity:40}),
    };
    const registry=[{entity_id:'sensor.outdoor_temperature',platform:'ecowitt',device_id:'station'},
      {entity_id:'sensor.outdoor_humidity',platform:'ecowitt',device_id:'station'},
      {entity_id:'sensor.renamed',platform:'thermal_comfort',device_id:'outside',translation_key:'humidex'},
      {entity_id:'sensor.renamed_sensation',platform:'thermal_comfort',device_id:'outside',translation_key:'humidex_perception'},
      {entity_id:'sensor.inside',platform:'thermal_comfort',device_id:'inside',translation_key:'humidex'}];
    const editor=document.createElement('niak-weather-card-editor'),events=[];
    editor.addEventListener('config-changed',e=>events.push(e.detail.config));
    editor.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.a',comfort_entity:'sensor.legacy',lightning_distance_entity:'sensor.legacy2'});
    editor.hass={states:editorStates,language:'fr',callWS:async msg=>msg.type==='config/entity_registry/list'?registry:[]};root.append(editor);await sleep(50);
    const form=editor.shadowRoot.querySelector('ha-form'),all=form.schema.flatMap(item=>item.schema??[item]);
    const thermal=form.schema.find(item=>item.name==='thermal');
    const ids=thermal.schema.find(item=>item.name==='humidex_entity').selector.entity.include_entities;
    const filtered=ids.join(',')==='sensor.renamed';
    const prefilled=form.data.humidex_entity==='sensor.renamed' && form.data.humidex_perception_entity==='sensor.renamed_sensation';
    const removed=!all.some(item=>['comfort_entity','lightning_distance_entity'].includes(item.name)) && !('comfort_entity' in events.at(-1));
    const renamed=form.schema.find(item=>item.name==='station').title==='Entités de la station';
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,humidex_entity:''}},bubbles:true}));await sleep(20);
    editor.shadowRoot.querySelector('button').click();await sleep(20);
    const preserved=events.at(-1).humidex_entity==='';
    editor.remove();root.append(window.card);
    window.card.setConfig({...window.fixture.config,weather_path:'/test-weather'});await sleep(30);
    window.info=[];const tile=window.card.shadowRoot.querySelector('.me-tu');
    tile.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:10,clientY:10}));
    tile.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:50,clientY:10}));
    tile.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const scrollRejected=window.info.length===0;
    tile.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:10,clientY:10}));await sleep(520);
    tile.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));tile.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const hold=location.pathname==='/test-weather'&&window.info.length===0;
    return {partial,race,filtered,prefilled,removed,renamed,preserved,scrollRejected,hold};
  });
  for (const [test, passed] of Object.entries(behavior)) assert.equal(passed,true, test);
  // Test the new optional Atmo branch independently: the original weather-only baseline remains unchanged above.
  const atmoBehavior = await page.evaluate(async () => {
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const metrics=[['air','Qualité globale'],['pm25','PM25'],['pm10','PM10'],['no2',"Dioxyde d’azote"],['o3','Ozone'],['so2','Dioxyde de soufre'],
      ['pollen','Qualité globale Pollen'],['grass','Niveau Graminé'],['ragweed','Niveau Ambroisie'],['mugwort','Niveau Armoise'],['alder','Niveau Aulne'],['birch','Niveau Bouleau'],['olive','Niveau Olivier'],
      ['grass_concentration','Concentration Graminé'],['ragweed_concentration','Concentration Ambroisie'],['mugwort_concentration','Concentration Armoise'],['alder_concentration','Concentration Aulne'],['birch_concentration','Concentration Bouleau'],['olive_concentration','Concentration Olivier']];
    const states={...window.fixture.states},registry=[],config={...window.fixture.config,pollens:[{id:'sensor.grasses',nom:'Ancien pollen EU'}]};
    for(const city of ['Ma commune','Autre commune']) for(const next of [false,true]) for(const [metric,name] of metrics){
      const id=`sensor.atmo_${city==='Ma commune'?'a':'b'}_${metric}${next?'_j_1':''}`,concentration=metric.endsWith('_concentration');
      states[id]={entity_id:id,state:concentration?'1.4':metric==='grass'?'6':metric==='air'?'3':'2',attributes:{attribution:'Atmo France-AtmoSud','Nom de la zone':city,'Type de zone':'Commune',
        'Date de mise à jour':new Date().toISOString(),...(concentration?{unit_of_measurement:'µg/m³'}:{})}};
      registry.push({entity_id:id,platform:'atmofrance',device_id:metric==='air'?'air':'pollen',config_entry_id:city==='Ma commune'?'a':'b',
        original_name:`${name}-${city}${next?'-J+1':''}`,unique_id:`${city}-${name}${next?'-J+1':''}`});
    }
    const hass={states,language:'fr',config:{time_zone:'Europe/Paris'},callWS:async msg=>msg.type==='config/entity_registry/list'?registry:[]};
    const root=document.querySelector('main');root.replaceChildren();
    const editor=document.createElement('niak-weather-card-editor');editor.setConfig(config);editor.hass=hass;root.append(editor);await sleep(50);
    const form=editor.shadowRoot.querySelector('ha-form');const selected={...form.data};
    const section=form.schema.find(item=>item.name==='atmo'),today=section.schema.find(item=>item.name==='atmo_today'),next=section.schema.find(item=>item.name==='atmo_tomorrow');
    const pollenLabels=section.schema.find(item=>item.name==='pollen_source').selector.select.options;
    const simplifiedLabel=pollenLabels.find(option=>option.value==='legacy')?.label==='Polleninformation' && !JSON.stringify(form.schema).includes('ancienne liste YAML');
    const fullPrefill=Object.keys(selected).filter(k=>/^atmo_.*_entity$/.test(k)&&selected[k]).length===38 && selected.pollen_source==='atmo';
    const filtered=today.schema.find(item=>item.name==='atmo_grass_entity').selector.entity.include_entities.join(',')==='sensor.atmo_a_grass'
      && next.schema.find(item=>item.name==='atmo_grass_tomorrow_entity').selector.entity.include_entities.join(',')==='sensor.atmo_a_grass_j_1'
      && today.schema.find(item=>item.name==='atmo_grass_concentration_entity').selector.entity.include_entities.join(',')==='sensor.atmo_a_grass_concentration';
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,atmo_grass_entity:''}},bubbles:true}));await sleep(20);
    editor.shadowRoot.querySelector('button').click();await sleep(20);const keptEmpty=form.data.atmo_grass_entity==='';
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,atmo_area:'zone:commune:autre commune'}},bubbles:true}));await sleep(40);
    const changedZone=form.data.atmo_air_entity==='sensor.atmo_b_air'&&form.data.atmo_grass_entity==='sensor.atmo_b_grass'&&form.data.model_entity===config.model_entity;
    editor.remove();const card=document.createElement('niak-weather-card');card.setConfig(selected);card.hass=hass;root.append(card);window.atmoCard=card;window.atmoHass=hass;window.atmoConfig=selected;window.atmoInfo=[];
    card.addEventListener('hass-more-info',e=>window.atmoInfo.push(e.detail.entityId));await sleep(30);
    const text=card.shadowRoot.textContent;
    const migration=!text.includes('Ancien pollen EU')&&text.includes('air intérieur')&&text.includes('Air extérieur');
    const levels=text.includes('Extrêmement élevé')&&text.includes('1,4 µg/m³')&&text.includes('Dégradé');
    const tomorrow=card.shadowRoot.querySelector('.nw-atmo-next');tomorrow.querySelector('summary').click();await sleep(10);
    const nativeDetails=!tomorrow.open&&window.atmoInfo.length===0;
    const movedDays=!!card.shadowRoot.querySelector('#today .nw-atmo-day')&&!card.shadowRoot.querySelector('#today .nw-atmo-next')&&!!card.shadowRoot.querySelector('#predictions .nw-atmo-next');
    const rings=card.shadowRoot.querySelectorAll('.nw-atmo-ring').length>2;
    const sectors=[...card.shadowRoot.querySelectorAll('.nw-atmo-disc svg')].every(e=>e.querySelectorAll('path').length===6);
    const visibleWorst=!!card.shadowRoot.querySelector('#today .nw-atmo-day>.nw-atmo-row [data-entity="sensor.atmo_a_grass"]');
    states[selected.atmo_pollen_entity].state='0';card.hass={...hass};await sleep(20);
    const noFalseZero=card.shadowRoot.querySelector('.nw-atmo-day').textContent.includes('Indisponible')&&!card.shadowRoot.querySelector('.nw-atmo-day').textContent.includes('0/6');
    const missingRing=card.shadowRoot.querySelector('#today [data-entity="'+selected.atmo_pollen_entity+'"]').style.getPropertyValue('--atmo-angle')==='0deg';
    states[selected.atmo_pollen_entity].state='2';card.hass={...hass};await sleep(20);
    window.atmoInfo=[];
    card.shadowRoot.querySelector('[data-entity="'+selected.atmo_air_entity+'"]').click();
    const correctPopup=window.atmoInfo[0]===selected.atmo_air_entity;
    return {fullPrefill,filtered,keptEmpty,changedZone,migration,levels,nativeDetails,noFalseZero,correctPopup,simplifiedLabel,movedDays,rings,sectors,visibleWorst,missingRing};
  });
  for (const [test,passed] of Object.entries(atmoBehavior)) assert.equal(passed,true,`Atmo: ${test}`);
  const atmoReports=[];
  for(const dark of [false,true]) for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1300});
    await page.evaluate(({dark})=>{
      document.documentElement.style.setProperty('--primary-text-color',dark?'#e4e4e4':'#20203f');
      document.documentElement.style.setProperty('--secondary-text-color',dark?'#aaa':'#686878');
      document.documentElement.style.setProperty('--card-background-color',dark?'#242424':'#fff4f4');
      document.body.style.background=dark?'#171717':'#eee7e7';
      window.atmoCard.shadowRoot.querySelector('.nw-atmo-next').open=true;
    },{dark});
    const overflow=await page.evaluate(()=>{
      const host=window.atmoCard.getBoundingClientRect();
      return [...window.atmoCard.shadowRoot.querySelectorAll('.nw-atmo-badge,.nw-atmo-concentration,.nw-atmo-next')].some(e=>{const r=e.getBoundingClientRect();return r.width&& (r.left<host.left-1||r.right>host.right+1)});
    });
    assert.equal(overflow,false,`Atmo overflow ${width}/${dark}`);
    await page.locator('niak-weather-card').screenshot({path:`${out}/atmo-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    const axe=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[],'Atmo structural accessibility');
    atmoReports.push({width,dark,overflow,accessibility:'structural scan passed'});
  }
  await page.locator('niak-weather-card #today .nw-atmo-breakdown summary').click();
  await page.locator('niak-weather-card .nw-atmo-day [data-entity="sensor.atmo_a_grass_concentration"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.atmoInfo.at(-1)),'sensor.atmo_a_grass_concentration','Atmo concentration keyboard popup');
  // Smart brief is a deliberate new hero, not an update of the v1 visual baseline.
  const briefBehavior = await page.evaluate(async () => {
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const root=document.querySelector('main');root.replaceChildren();
    const states={...window.atmoCard.hass.states};
    const localHour=+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'numeric',hourCycle:'h23'}).format(new Date());
    states['sensor.model']={...states['sensor.model'],attributes:{...states['sensor.model'].attributes,vent:45,rafales:75,rafale_max_jour:90,pluie_dans:1,pluie_mm:7,sources:{...states['sensor.model'].attributes.sources,vent:'sensor.wind',rafales:'sensor.wind'}}};
    states['sensor.wind']={entity_id:'sensor.wind',state:'75',attributes:{unit_of_measurement:'km/h'}};
    states['sensor.prev']={...states['sensor.prev'],attributes:{...states['sensor.prev'].attributes,heures:Array.from({length:18},(_,i)=>({h:(localHour+i+1)%24,j:Math.floor((localHour+i+1)/24),t:21+i/2,p:i<3?7:0,c:i===2?'lightning-rainy':'rainy'}))}};
    states['sensor.atmo_a_air']={...states['sensor.atmo_a_air'],state:'5'};
    states['sensor.vigilance']={entity_id:'sensor.vigilance',state:'Orange',attributes:{attribution:'Météo-France',Orages:'Orange'},last_updated:new Date().toISOString()};
    const card=document.createElement('niak-weather-card');
    card.setConfig({...window.atmoCard.config,smart_brief:true,vigilance_entity:'sensor.vigilance'});
    card.hass={...window.atmoCard.hass,states};root.append(card);window.briefCard=card;window.briefInfo=[];
    card.addEventListener('hass-more-info',e=>window.briefInfo.push(e.detail.entityId));await sleep(50);
    const text=card.shadowRoot.querySelector('#heros').textContent;
    const combined=['75 km/h','Fortes pluies','Vigilance Météo-France orange'].every(s=>text.includes(s));
    const concise=card.shadowRoot.querySelectorAll('.nw-summary-lines p').length<=3;
    card.shadowRoot.querySelector('.nw-brief-details summary').click();await sleep(20);
    const nativeDetails=card.shadowRoot.querySelector('.nw-brief-details').open && window.briefInfo.length===0;
    const hasSource=!!card.shadowRoot.querySelector('.nw-brief-details button[data-entity="sensor.wind"]');
    const orange=card.shadowRoot.querySelector('#heros').style.getPropertyValue('--vc').trim()==='230,125,45';
    return {combined,nativeDetails,hasSource,orange,concise};
  });
  for(const [test,passed] of Object.entries(briefBehavior))assert.equal(passed,true,`Brief: ${test}`);
  await page.locator('niak-weather-card .nw-brief-details button[data-entity="sensor.wind"]').first().focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.briefInfo.at(-1)),'sensor.wind','Brief source keyboard popup');
  await page.evaluate(()=>{window.briefCard.shadowRoot.querySelector('.nw-brief-details').open=false;});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const haloMotion=await page.evaluate(async()=>{
    const root=window.briefCard.shadowRoot, circle=root.querySelector('.nw-summary-emblem .me-rond'), halo=root.querySelector('.nw-summary-emblem .me-halo');
    const animated=getComputedStyle(circle).animationName==='meRespire'&&getComputedStyle(halo).animationName==='nwHalo';
    const before=halo.getAnimations()[0]?.currentTime;
    await new Promise(r=>setTimeout(r,150));
    const advancing=halo.getAnimations()[0]?.currentTime>before;
    return {animated,advancing};
  });
  assert.equal(haloMotion.animated,true,'Circle and halo animation enabled');assert.equal(haloMotion.advancing,true,'Halo animation actually advances');
  await page.emulateMedia({reducedMotion:'reduce'});
  haloMotion.reduced=await page.evaluate(()=>[...window.briefCard.shadowRoot.querySelectorAll('.nw-summary-emblem .me-rond,.nw-summary-emblem .me-halo')].every(e=>getComputedStyle(e).animationName==='none'));
  assert.equal(haloMotion.reduced,true,'Reduced motion disables both animations');
  const briefReports=[];
  for(const dark of [false,true]) for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1500});
    await page.evaluate(({dark})=>{
      document.documentElement.style.setProperty('--primary-text-color',dark?'#e4e4e4':'#20203f');
      document.documentElement.style.setProperty('--secondary-text-color',dark?'#aaa':'#686878');
      document.documentElement.style.setProperty('--card-background-color',dark?'#242424':'#fff4f4');
      document.body.style.background=dark?'#171717':'#eee7e7';
    },{dark});
    const overflow=await page.evaluate(()=>{const host=window.briefCard.getBoundingClientRect();return [...window.briefCard.shadowRoot.querySelectorAll('.me-htop,.me-t,.me-p,.nw-brief-details')].some(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left<host.left-1||r.right>host.right+1)});});
    assert.equal(overflow,false,`Brief overflow ${width}/${dark}`);
    await page.locator('niak-weather-card').screenshot({path:`${out}/brief-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.locator('niak-weather-card #heros').screenshot({path:`${out}/brief-header-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.locator('niak-weather-card #today .nw-atmo-day').screenshot({path:`${out}/atmo-discs-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    const axe=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[],'Brief structural accessibility');
    briefReports.push({width,dark,overflow,accessibility:'structural scan passed; new hero has no committed visual baseline yet'});
  }
  assert.deepEqual(errors,[],'browser console/network');
  const compactAndMissing=await page.evaluate(async()=>{
    const root=document.querySelector('main');root.replaceChildren();
    const card=document.createElement('niak-weather-card');
    const states={'weather.test':{entity_id:'weather.test',state:'unavailable',attributes:{}},'sensor.old':{entity_id:'sensor.old',state:'unavailable',attributes:{t_ext:40,ressenti:48,vent:90,pluie_taux:12}}};
    card.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.test',model_entity:'sensor.old',mode:'compact'});
    card.hass={states,callWS:async()=>({})};root.append(card);await new Promise(r=>setTimeout(r,30));
    const shadow=card.shadowRoot;
    const twoSections=shadow.querySelectorAll('#container>.nw-section').length===2&&!shadow.querySelector('#predictions');
    const fourTiles=shadow.querySelectorAll('.me-tu').length===4;
    const noStale=!shadow.querySelector('#today').textContent.includes('48')&&!shadow.querySelector('#today').textContent.includes('40');
    const missing=shadow.querySelector('#today').textContent.includes('intensité indisponible');
    return {twoSections,fourTiles,noStale,missing};
  });
  for(const [test,passed] of Object.entries(compactAndMissing))assert.equal(passed,true,`Compact/missing: ${test}`);
  writeFileSync(`${out}/browser-report.json`,JSON.stringify({reports,behavior,atmoBehavior,atmoReports,briefBehavior,briefReports,compactAndMissing,haloMotion,errors},null,2));
  console.log(JSON.stringify({reports,behavior,atmoBehavior,atmoReports,briefBehavior,briefReports,compactAndMissing,haloMotion,errors},null,2));
} finally { await browser.close();server.close(); }

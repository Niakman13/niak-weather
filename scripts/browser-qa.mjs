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
        'weather.test':{entity_id:'weather.test',state:'partlycloudy',attributes:{friendly_name:'Ma commune',attribution:'Météo-France',temperature:A.t_ext,temperature_unit:'°C'}},
        'sensor.t_ext':{entity_id:'sensor.t_ext',state:String(A.t_ext),attributes:{unit_of_measurement:'°C'}}, 'sensor.hr_ext':{entity_id:'sensor.hr_ext',state:String(A.hr_ext),attributes:{unit_of_measurement:'%'}},
        'sensor.vent':{entity_id:'sensor.vent',state:String(A.vent),attributes:{unit_of_measurement:'km/h'}}, 'sensor.rafales':{entity_id:'sensor.rafales',state:String(A.rafales),attributes:{unit_of_measurement:'km/h'}},
        'sensor.pluie_taux':{entity_id:'sensor.pluie_taux',state:String(A.pluie_taux),attributes:{unit_of_measurement:'mm/h'}}, 'sensor.pluie_jour':{entity_id:'sensor.pluie_jour',state:String(A.pluie_jour),attributes:{unit_of_measurement:'mm'}},
        'sensor.pluie_semaine':{entity_id:'sensor.pluie_semaine',state:'2',attributes:{unit_of_measurement:'mm'}}, 'sensor.pluie_mois':{entity_id:'sensor.pluie_mois',state:'12',attributes:{unit_of_measurement:'mm'}},
        'sensor.pression':{entity_id:'sensor.pression',state:'1001',attributes:{unit_of_measurement:'hPa'}}, 'sensor.grasses':{entity_id:'sensor.grasses',state:'low',attributes:{}} };
      const order = ['heros','essentiels','sect1','tuiles','pastilles','sect2','courbe','jours','sect3','bilan'];
      const baseline = document.createElement('div'); baseline.id='baseline';
      const fields = Object.fromEntries(Object.entries(reference.fields).map(([k,code]) => [k,new Function('variables','states','hass',code)]));
      const rendered = {}; for (const k of Object.keys(reference.fields)) rendered[k] = fields[k](variables,states,{});
      baseline.innerHTML = `<div id="container">${order.map(k=>`<div style="grid-area:${k}" id="${k}">${rendered[k]}</div>`).join('')}</div>`;
      document.querySelector('main').append(baseline);
      window.fixture = { states, forecasts:{ hourly:heures.map((p,i)=>({datetime:new Date(Date.now()+i*3600_000).toISOString(),temperature:p.t,precipitation:p.p,condition:p.c})), daily:jours.map((p,i)=>({datetime:new Date(Date.now()+i*86400_000).toISOString(),temperature:p.t,templow:p.m,precipitation:p.p,condition:p.c})) }, config:{type:'custom:niak-weather-card',weather_entity:'weather.test',smart_brief:false,temperature_entity:'sensor.t_ext',humidity_entity:'sensor.hr_ext',wind_speed_entity:'sensor.vent',wind_gust_entity:'sensor.rafales',rain_rate_entity:'sensor.pluie_taux',daily_rain_entity:'sensor.pluie_jour',weekly_rain_entity:'sensor.pluie_semaine',monthly_rain_entity:'sensor.pluie_mois',pressure_entity:'sensor.pression',pollens:variables.pollens,location:'Ma commune',forecast_source:'Météo-France',mode:'detailed'} };
      await import('/card.js');
    }, { reference, fixture: fixtures[0], icons: mdi, dark });
    const baseline = await page.locator('#baseline').screenshot({ path:`${out}/original-${width}-${dark?'dark':'light'}.png`, animations:'disabled' });
    await page.evaluate(() => {
      document.querySelector('#baseline').remove(); const card = document.createElement('niak-weather-card');
      card.setConfig(window.fixture.config); card.hass = { states:window.fixture.states,language:'fr',config:{time_zone:'Europe/Paris'},callWS:async msg=>({response:{'weather.test':{forecast:window.fixture.forecasts[msg.service_data.type]}}}) };
      document.querySelector('main').append(card); window.card=card;
    });
    await page.locator('niak-weather-card .me-bl').first().waitFor();
    const actual = await page.locator('niak-weather-card').screenshot({ path:`${out}/niak-${width}-${dark?'dark':'light'}.png`,animations:'disabled' });
    await page.locator('niak-weather-card .nw-forecast-grid').screenshot({path:`${out}/forecast-panels-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    const a = PNG.sync.read(baseline), b=PNG.sync.read(actual);
    assert.equal(b.width,a.width, 'card width');
    const layout=await page.evaluate(()=>{
      const root=window.card.shadowRoot, host=window.card.getBoundingClientRect();
      const sections=[...root.querySelectorAll('#container>.nw-section')].map(s=>s.querySelector('h2').textContent);
      const tiles=[...root.querySelectorAll('#bilan .nw-history-card')].map(s=>s.querySelector('h3').textContent);
      const forecast=root.querySelector('#courbe .nw-forecast-card h3')?.textContent;
      const order=root.querySelector('#comfort').getBoundingClientRect().top<root.querySelector('#bilan').getBoundingClientRect().top;
      const overflow=[...root.querySelectorAll('.nw-section,.me-tu,.me-bl,.me-graph,.me-j')].some(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left<host.left-1||r.right>host.right+1)});
      return {sections,tiles,forecast,order,overflow};
    });
    assert.deepEqual(layout.sections,['Météo actuelle','Aujourd’hui','Prévisions']);
    assert.deepEqual(layout.tiles,['Pluie','Vent','Pression']);
    assert.equal(layout.forecast,'18 prochaines heures','Forecast chart framed like the columns');
    assert.equal(layout.order,true);assert.equal(layout.overflow,false);
    const forecastGeometry=await page.evaluate(()=>{
      const root=window.card.shadowRoot, curve=root.querySelector('#courbe .nw-forecast-card'), days=root.querySelector('#jours'), area=root.querySelector('.nw-fc-area');
      const tags=[...root.querySelectorAll('.nw-fc-tag')].map(e=>e.getBoundingClientRect()),glyphs=root.querySelectorAll('.nw-fc-hour>ha-icon').length;
      const units=[...root.querySelectorAll('.nw-fc-y--t>span,.nw-fc-extreme')].every(e=>e.textContent.trim().endsWith('°C'));
      return {aligned:Math.abs(curve.getBoundingClientRect().bottom-days.getBoundingClientRect().bottom)<2,height:area.getBoundingClientRect().height,glyphs,units,
        distinct:tags.length<2||tags[0].bottom<=tags[1].top||tags[1].bottom<=tags[0].top||tags[0].right<=tags[1].left||tags[1].right<=tags[0].left};
    });
    if(width>850) assert.equal(forecastGeometry.aligned,true,`forecast columns fill the same height: ${JSON.stringify(forecastGeometry)}`);
    assert.ok(forecastGeometry.height>=150,'forecast graph has usable height');
    assert.ok(forecastGeometry.glyphs>=3,'forecast shows the week-table weather icons under the hours');
    assert.equal(forecastGeometry.units,true,'temperature axis and extremes carry °C');
    assert.equal(forecastGeometry.distinct,true,'now/tomorrow labels remain distinct');
    const refinedLayout=await page.evaluate(()=>{
      const root=window.card.shadowRoot,labels=root.querySelector('.nw-week-labels');
      const row=root.querySelector('.me-j:not(.nw-week-labels)');
      return {headers:['Min','Max','Pluie','°C','mm'].every(s=>labels.textContent.includes(s)),aligned:['.me-jmin','.me-jmax','.me-jp'].every(s=>Math.abs(labels.querySelector(s).getBoundingClientRect().left-row.querySelector(s).getBoundingClientRect().left)<1),alwaysVisible:!root.querySelector('#bilan').closest('details'),centered:['#comfort .me-decos','#pastilles .me-pas'].every(s=>getComputedStyle(root.querySelector(s)).justifyContent==='center'),noSeparator:getComputedStyle(root.querySelector('#pastilles .me-pas')).borderTopWidth==='0px',pills:[...root.querySelectorAll('#comfort .me-d,#pastilles .me-pa')].every(e=>getComputedStyle(e).borderRadius==='999px')};
    });
    for(const [key,value] of Object.entries(refinedLayout))assert.equal(value,true,`Refined layout ${width}px: ${key}`);
    const feelsLabel=await page.evaluate(()=>{
      const root=window.card.shadowRoot, label=root.querySelector('.nw-feels-value'), rail=root.querySelector('#comfort .me-rail'), cursor=root.querySelector('#comfort .me-cur i');
      const sections=root.querySelectorAll('#container>.nw-section');
      return {above:label.getBoundingClientRect().bottom<rail.getBoundingClientRect().top,large:parseFloat(getComputedStyle(label).fontSize)>=24,sameColor:getComputedStyle(label).color===getComputedStyle(cursor).backgroundColor,
        framed:parseFloat(getComputedStyle(root.querySelector('#comfort')).borderTopWidth)>=1,sectionGap:sections[1].getBoundingClientRect().top>sections[0].getBoundingClientRect().bottom,
        headingLarge:parseFloat(getComputedStyle(root.querySelector('.nw-section-heading h2')).fontSize)>=17};
    });
    assert.deepEqual(feelsLabel,{above:true,large:true,sameColor:true,framed:true,sectionGap:true,headingLarge:true});
    const events=[]; await page.evaluate(()=>{window.info=[];window.card.addEventListener('hass-more-info',e=>window.info.push(e.detail.entityId));});
    await page.locator('niak-weather-card [aria-label="Bilan vent"] .nw-history-value').first().click();
    assert.equal(await page.evaluate(()=>window.info[0]),'sensor.vent');
    await page.locator('niak-weather-card .nw-current-temperature').focus(); await page.keyboard.press('Enter');
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
    editor.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.a',comfort_entity:'sensor.legacy',lightning_distance_entity:'sensor.legacy2',humidex_entity:'sensor.renamed',thermal_device_id:'outside'});
    editor.hass={states:editorStates,language:'fr',callWS:async msg=>msg.type==='config/entity_registry/list'?registry:[]};root.append(editor);await sleep(50);
    editor.shadowRoot.querySelector('details[data-category="station"]').open=true;await sleep(20);
    editor.shadowRoot.querySelector('button[data-fill="station"]').click();await sleep(30);
    // No Thermal Comfort section any more: the card computes humidex, dew and frost points from temperature and humidity.
    const form=editor.shadowRoot.querySelector('ha-form[data-category="station"]'),all=form.schema;
    const offered=[];const walk=items=>items.forEach(item=>{if(item.schema)walk(item.schema);if(item.selector?.entity?.include_entities)offered.push(...item.selector.entity.include_entities);});walk(all);
    const filtered=!offered.some(id=>['sensor.renamed','sensor.renamed_sensation','sensor.inside'].includes(id));
    const prefilled=form.data.humidity_entity==='sensor.outdoor_humidity';
    const simplifiedThermal=!editor.shadowRoot.querySelector('details[data-category="thermal"]')&&!editor.shadowRoot.textContent.includes('Thermal Comfort')&&!('humidex_entity' in events.at(-1))&&!('thermal_device_id' in events.at(-1));
    const recommendedStation=editor.shadowRoot.querySelector('details[data-category="station"] .category-body p').textContent.startsWith('Conseillé :');
    const removed=!all.some(item=>['comfort_entity','lightning_distance_entity'].includes(item.name)) && !('comfort_entity' in events.at(-1));
    const renamed=editor.shadowRoot.querySelector('details[data-category="station"] summary').textContent.includes('Capteurs locaux / station météo locale');
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,dew_point_entity:''}},bubbles:true}));await sleep(20);
    editor.shadowRoot.querySelector('button[data-fill="station"]').click();await sleep(20);
    const preserved=events.at(-1).dew_point_entity==='';
    editor.remove();root.append(window.card);
    window.card.setConfig({...window.fixture.config,weather_path:'/test-weather'});await sleep(30);
    window.info=[];const tile=window.card.shadowRoot.querySelector('[aria-label="Bilan vent"] .nw-history-value');
    tile.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:10,clientY:10}));
    tile.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:50,clientY:10}));
    tile.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const scrollRejected=window.info.length===0;
    tile.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:10,clientY:10}));await sleep(520);
    tile.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));tile.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const hold=location.pathname==='/test-weather'&&window.info.length===0;
    return {partial,race,filtered,prefilled,removed,renamed,preserved,scrollRejected,hold,simplifiedThermal,recommendedStation};
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
    const hass={states,language:'fr',config:{time_zone:'Europe/Paris'},callWS:async msg=>msg.type==='config/entity_registry/list'?registry:msg.type==='call_service'?{response:{'weather.test':{forecast:window.fixture.forecasts[msg.service_data.type]}}}:[]};
    const root=document.querySelector('main');root.replaceChildren();
    const editor=document.createElement('niak-weather-card-editor');editor.setConfig(config);editor.hass=hass;root.append(editor);await sleep(50);
    editor.shadowRoot.querySelector('details[data-category="atmo"]').open=true;await sleep(20);
    editor.shadowRoot.querySelector('button[data-fill="atmo"]').click();await sleep(30);
    const form=editor.shadowRoot.querySelector('ha-form[data-category="atmo"]');const selected={...editor.config};
    const today=form.schema.find(item=>item.name==='atmo_today'),next=form.schema.find(item=>item.name==='atmo_tomorrow');
    const simplifiedLabel=!form.schema.some(item=>item.name==='pollen_source') && !JSON.stringify(form.schema).includes('ancienne liste YAML');
    const fullPrefill=Object.keys(selected).filter(k=>/^atmo_.*_entity$/.test(k)&&selected[k]).length===38 && selected.pollen_source==='atmo';
    const filtered=today.schema.find(item=>item.name==='atmo_grass_entity').selector.entity.include_entities.join(',')==='sensor.atmo_a_grass'
      && next.schema.find(item=>item.name==='atmo_grass_tomorrow_entity').selector.entity.include_entities.join(',')==='sensor.atmo_a_grass_j_1'
      && today.schema.find(item=>item.name==='atmo_grass_concentration_entity').selector.entity.include_entities.join(',')==='sensor.atmo_a_grass_concentration';
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,atmo_grass_entity:''}},bubbles:true}));await sleep(20);
    editor.shadowRoot.querySelector('button[data-fill="atmo"]').click();await sleep(20);const keptEmpty=form.data.atmo_grass_entity==='';
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,atmo_area:'zone:commune:autre commune'}},bubbles:true}));await sleep(40);
    const changedZone=form.data.atmo_air_entity==='sensor.atmo_b_air'&&form.data.atmo_grass_entity==='sensor.atmo_b_grass';
    editor.remove();const card=document.createElement('niak-weather-card');card.setConfig(selected);card.hass=hass;root.append(card);window.atmoCard=card;window.atmoHass=hass;window.atmoConfig=selected;window.atmoInfo=[];
    card.addEventListener('hass-more-info',e=>window.atmoInfo.push(e.detail.entityId));await sleep(30);
    const text=card.shadowRoot.textContent;
    const migration=!text.includes('Ancien pollen EU')&&!text.includes('air intérieur')&&text.includes('Air extérieur');
    const levels=text.includes('Extrêmement élevé')&&text.includes('1,4 µg/m³')&&text.includes('Dégradé');
    const tomorrow=card.shadowRoot.querySelector('.nw-atmo-next'),breakdown=tomorrow.querySelector('.nw-atmo-breakdown');
    const initiallyCollapsed=!breakdown.open;
    breakdown.querySelector('summary').click();await sleep(10);
    const nativeDetails=tomorrow.tagName==='SECTION'&&initiallyCollapsed&&breakdown.open&&window.atmoInfo.length===0;
    breakdown.open=false;
    const movedDays=!!card.shadowRoot.querySelector('#today .nw-atmo-day')&&!card.shadowRoot.querySelector('#today .nw-atmo-next')&&!!card.shadowRoot.querySelector('#predictions .nw-atmo-next');
    const rings=card.shadowRoot.querySelectorAll('.nw-atmo-ring').length>2;
    const sectors=[...card.shadowRoot.querySelectorAll('.nw-atmo-disc svg')].every(e=>e.querySelectorAll('path').length===6);
    const continuousGradient=[...card.shadowRoot.querySelectorAll('.nw-atmo-disc')].every(e=>getComputedStyle(e).backgroundImage.includes('conic-gradient'));
    const visibleWorst=!!card.shadowRoot.querySelector('#today .nw-atmo-day>.nw-atmo-row [data-entity="sensor.atmo_a_grass"]');
    states[selected.atmo_pollen_entity].state='0';card.hass={...hass};await sleep(20);
    const pollenCard=card.shadowRoot.querySelector('#today .nw-atmo-day[data-kind="pollen"]');
    const noFalseZero=pollenCard.textContent.includes('Indisponible')&&!pollenCard.textContent.includes('0/6');
    const splitCards=card.shadowRoot.querySelectorAll('#today .nw-atmo-day').length===2&&card.shadowRoot.querySelectorAll('#predictions .nw-atmo-day').length===2;
    const missingRing=card.shadowRoot.querySelector('#today [data-entity="'+selected.atmo_pollen_entity+'"]').style.getPropertyValue('--atmo-angle')==='0deg';
    const missingMasked=[...card.shadowRoot.querySelector('#today [data-entity="'+selected.atmo_pollen_entity+'"]').querySelectorAll('svg path')].every(e=>e.getAttribute('fill')!=='none');
    states[selected.atmo_pollen_entity].state='2';card.hass={...hass};await sleep(20);
    window.atmoInfo=[];
    card.shadowRoot.querySelector('[data-entity="'+selected.atmo_air_entity+'"]').click();
    const correctPopup=window.atmoInfo[0]===selected.atmo_air_entity;
    return {fullPrefill,filtered,keptEmpty,changedZone,migration,levels,nativeDetails,noFalseZero,correctPopup,simplifiedLabel,movedDays,rings,sectors,continuousGradient,visibleWorst,missingRing,missingMasked,splitCards};
  });
  for (const [test,passed] of Object.entries(atmoBehavior)) assert.equal(passed,true,`Atmo: ${test}`);
  const atmoReports=[];
  await page.evaluate(()=>window.atmoCard.setConfig({...window.atmoConfig,smart_brief:true}));
  for(const dark of [false,true]) for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1300});
    await page.evaluate(({dark})=>{
      document.documentElement.style.setProperty('--primary-text-color',dark?'#e4e4e4':'#20203f');
      document.documentElement.style.setProperty('--secondary-text-color',dark?'#aaa':'#686878');
      document.documentElement.style.setProperty('--card-background-color',dark?'#242424':'#fff4f4');
      document.body.style.background=dark?'#171717':'#eee7e7';
    },{dark});
    const overflow=await page.evaluate(()=>{
      const host=window.atmoCard.getBoundingClientRect();
      return [...window.atmoCard.shadowRoot.querySelectorAll('.nw-atmo-badge,.nw-atmo-concentration,.nw-atmo-next')].some(e=>{const r=e.getBoundingClientRect();return r.width&& (r.left<host.left-1||r.right>host.right+1)});
    });
    assert.equal(overflow,false,`Atmo overflow ${width}/${dark}`);
    await page.locator('niak-weather-card').screenshot({path:`${out}/atmo-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.evaluate(()=>window.atmoCard.shadowRoot.querySelectorAll('#today .nw-atmo-breakdown').forEach(e=>e.open=true));
    const detailLayout=await page.evaluate(()=>{
      const root=window.atmoCard.shadowRoot;
      return [...root.querySelectorAll('#today .nw-atmo-breakdown .nw-atmo-row')].every(e=>getComputedStyle(e).display==='grid'&&getComputedStyle(e).justifyItems==='center')&&[...root.querySelectorAll('#today .nw-atmo-species-item')].every(e=>getComputedStyle(e).alignItems==='center');
    });assert.equal(detailLayout,true,'Atmo details use centered grids');
    const inlinePollenValues=await page.evaluate(()=>[...window.atmoCard.shadowRoot.querySelectorAll('#today .nw-atmo-values')].every(e=>{
      const level=e.querySelector('.nw-atmo-level'),concentration=e.querySelector('.nw-atmo-concentration');
      return !level||Math.abs(level.getBoundingClientRect().top-concentration.getBoundingClientRect().top)<2;
    }));assert.equal(inlinePollenValues,true,'Pollen level and concentration share one line');
    await page.locator('niak-weather-card #today .nw-atmo-grid').screenshot({path:`${out}/atmo-details-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.evaluate(()=>window.atmoCard.shadowRoot.querySelectorAll('#today .nw-atmo-breakdown').forEach(e=>e.open=false));
    const axe=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[],'Atmo structural accessibility');
    atmoReports.push({width,dark,overflow,accessibility:'structural scan passed'});
  }
  await page.locator('niak-weather-card #today .nw-atmo-day[data-kind="pollen"] .nw-atmo-breakdown summary').click();
  await page.locator('niak-weather-card .nw-atmo-day [data-entity="sensor.atmo_a_grass_concentration"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.atmoInfo.at(-1)),'sensor.atmo_a_grass_concentration','Atmo concentration keyboard popup');
  // Smart brief is a deliberate new hero, not an update of the v1 visual baseline.
  const briefBehavior = await page.evaluate(async () => {
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const root=document.querySelector('main');root.replaceChildren();
    const states={...window.atmoCard.hass.states};
    states['sensor.vent']={entity_id:'sensor.vent',state:'45',attributes:{unit_of_measurement:'km/h'}};
    states['sensor.rafales']={entity_id:'sensor.rafales',state:'75',attributes:{unit_of_measurement:'km/h'}};
    states['sensor.atmo_a_air']={...states['sensor.atmo_a_air'],state:'5'};
    states['sensor.vigilance']={entity_id:'sensor.vigilance',state:'Orange',attributes:{attribution:'Météo-France',Orages:'Orange'},last_updated:new Date().toISOString()};
    const card=document.createElement('niak-weather-card');
    card.setConfig({...window.atmoCard.config,smart_brief:true,vigilance_entity:'sensor.vigilance'});
    const hourly=Array.from({length:18},(_,i)=>({datetime:new Date(Date.now()+(i+1)*3600000).toISOString(),temperature:21+i/2,precipitation:i<3?7:0,condition:i===2?'lightning-rainy':'rainy'}));
    card.hass={...window.atmoCard.hass,states,callWS:async message=>message.type==='call_service'?{response:{'weather.test':{forecast:hourly}}}:[]};root.append(card);window.briefCard=card;window.briefInfo=[];
    card.addEventListener('hass-more-info',e=>window.briefInfo.push(e.detail.entityId));await sleep(50);
    const text=card.shadowRoot.querySelector('#heros').textContent;
    const combined=['75 km/h','Fortes pluies','Vigilance Météo-France orange'].every(s=>text.includes(s));
    const concise=card.shadowRoot.querySelectorAll('.nw-b-chip').length<=3;
    const banner=card.shadowRoot.querySelector('#heros'),nextSection=card.shadowRoot.querySelector('#today');
    const before=[banner.getBoundingClientRect().height,nextSection.getBoundingClientRect().top];
    card.shadowRoot.querySelector('.nw-synthesis-info-button').click();await sleep(20);
    const panel=card.shadowRoot.querySelector('.nw-brief-panel');
    const nativeDetails=panel.matches(':popover-open') && window.briefInfo.length===0;
    const noLayoutShift=JSON.stringify(before)===JSON.stringify([banner.getBoundingClientRect().height,nextSection.getBoundingClientRect().top]);
    const simplePanel=!panel.textContent.includes('La couleur suit')&&[...panel.querySelectorAll('.nw-brief-group')].every(e=>getComputedStyle(e).borderWidth==='0px');
    const hasSource=!!card.shadowRoot.querySelector('.nw-brief-details button[data-entity="sensor.rafales"]');
    const readableGroups=card.shadowRoot.querySelectorAll('.nw-brief-group').length===4&&!card.shadowRoot.querySelector('.nw-brief-details').textContent.includes('≥');
    const infoAtTitle=!!card.shadowRoot.querySelector('.nw-section-heading .nw-synthesis-info-button .nw-info-icon')&&!card.shadowRoot.querySelector('#heros>.nw-brief-details');
    const help=card.shadowRoot.querySelector('.nw-synthesis-info-button');help.focus();help.click();
    const helpClosed=!panel.matches(':popover-open');help.click();
    const orange=card.shadowRoot.querySelector('#heros').style.getPropertyValue('--vc').trim()==='230,125,45';
    return {combined,nativeDetails,hasSource,orange,concise,readableGroups,infoAtTitle,helpClosed,noLayoutShift,simplePanel};
  });
  for(const [test,passed] of Object.entries(briefBehavior))assert.equal(passed,true,`Brief: ${test}`);
  await page.locator('niak-weather-card .nw-brief-details button[data-entity="sensor.rafales"]').first().focus();await page.keyboard.press('Enter');
  await page.locator('niak-weather-card .nw-synthesis-info-button').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.briefCard.shadowRoot.querySelector('.nw-brief-panel').matches(':popover-open')),false,'Synthesis help closes with keyboard');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.briefCard.shadowRoot.querySelector('.nw-brief-panel').matches(':popover-open')),true,'Synthesis help opens with keyboard');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>window.briefCard.shadowRoot.querySelector('.nw-brief-panel').matches(':popover-open')),false,'Escape dismisses synthesis help');
  await page.locator('niak-weather-card .nw-synthesis-info-button').click();
  await page.locator('niak-weather-card .nw-brief-panel-heading button').click();
  assert.equal(await page.evaluate(()=>window.briefCard.shadowRoot.querySelector('.nw-brief-panel').matches(':popover-open')),false,'Explicit close button dismisses synthesis help');
  await page.locator('niak-weather-card .nw-synthesis-info-button').click();
  await page.mouse.click(2,2);
  assert.equal(await page.evaluate(()=>window.briefCard.shadowRoot.querySelector('.nw-brief-panel').matches(':popover-open')),false,'Outside click dismisses synthesis help');
  assert.equal(await page.evaluate(()=>window.briefInfo.at(-1)),'sensor.rafales','Brief source keyboard popup');
  const noAtmoBrief=await page.evaluate(async()=>{
    const card=document.createElement('niak-weather-card');card.id='no-atmo-card';window.noAtmoCard=card;
    const e=(entity_id,state,unit)=>({entity_id,state:String(state),attributes:{unit_of_measurement:unit}});
    const states={...window.fixture.states,'weather.test':{...window.fixture.states['weather.test'],state:'rainy'},'sensor.t_ext':e('sensor.t_ext',24.6,'°C'),'sensor.vent':e('sensor.vent',7,'km/h'),'sensor.rafales':e('sensor.rafales',11,'km/h'),'sensor.pluie_taux':e('sensor.pluie_taux',0,'mm/h')};
    const hourly=Array.from({length:6},(_,i)=>({datetime:new Date(Date.now()+(i+1)*3600000).toISOString(),temperature:24.6-i*1.5,precipitation:0,condition:'cloudy'}));
    card.setConfig({...window.fixture.config,smart_brief:true,show_bulletin:false,pollen_source:'none',pollens:[]});
    card.hass={states,language:'fr',callWS:async message=>message.type==='call_service'?{response:{'weather.test':{forecast:hourly}}}:{}};
    document.querySelector('main').append(card);await new Promise(r=>setTimeout(r,60));
    const root=card.shadowRoot,title=root.querySelector('.nw-b-headline').textContent;
    return {outlookInsteadOfSky:title.includes('Fraîcheur annoncée')&&!title.includes('Pluvieux'),localRainStillAuthoritative:root.querySelector('.nw-current-condition').textContent.includes('sans pluie mesurée'),outlookNotRepeated:(root.querySelector('.nw-b-chips')?.textContent ?? '').includes('Fraîcheur annoncée')===false,informationalNotAlert:root.querySelector('#heros').style.getPropertyValue('--vc').trim()==='61,155,233',explainable:root.querySelector('.nw-brief-details').textContent.includes('Fraîcheur annoncée')};
  });
  for(const [key,value] of Object.entries(noAtmoBrief))assert.equal(value,true,`No Atmo brief: ${key}`);
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:1200});
    await page.locator('#no-atmo-card #heros').screenshot({path:`${out}/brief-no-atmo-${width}.png`,animations:'disabled'});
  }
  await page.evaluate(()=>window.noAtmoCard.remove());
  const pressureBrief=await page.evaluate(async()=>{
    const card=document.createElement('niak-weather-card'),base=window.briefCard;
    const states={...base.hass.states};
    for(const [id,value] of [['sensor.vent','7'],['sensor.rafales','11'],['sensor.pluie_taux','0'],['sensor.atmo_a_air','3'],['sensor.pression','1001.1']]) states[id]={...states[id],state:value};
    card.setConfig({...base.config,vigilance_entity:undefined,pressure_entity:'sensor.pression'});
    const time=Date.now()/1000;
    const history={'sensor.pression':[{s:'1000',lu:time-10800},{s:'1000.2',lu:time-9800}]};
    const hourly=Array.from({length:6},(_,i)=>({datetime:new Date(Date.now()+(i+1)*3600000).toISOString(),temperature:24,precipitation:0,condition:'cloudy'}));
    card.hass={...base.hass,states,callWS:async msg=>msg.type==='call_service'?{response:{'weather.test':{forecast:hourly}}}:history};
    document.querySelector('main').append(card);await new Promise(r=>setTimeout(r,60));
    const text=()=>card.shadowRoot.querySelector('.nw-b-chips')?.textContent ?? '';
    const first=text().includes('Pression en hausse (1,1 hPa sur 3 h)');
    card.requestUpdate();await card.updateComplete;
    const result={pressureAlongsideAir:first&&text().includes('Pression en hausse'),noEmptyOutlook:!text().includes('Pas de signal')&&!text().includes('À venir')};
    card.remove();return result;
  });
  for(const [key,value] of Object.entries(pressureBrief))assert.equal(value,true,`Meaningful pressure brief: ${key}`);
  await page.evaluate(()=>{window.briefCard.shadowRoot.querySelector('.nw-brief-panel').hidePopover();});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const haloMotion=await page.evaluate(async()=>{
    const root=window.briefCard.shadowRoot, circle=root.querySelector('.nw-b-vigil-mark'), halo=root.querySelector('.nw-b-vigil-halo');
    const animated=getComputedStyle(circle).animationName==='nwVigilGlow'&&getComputedStyle(halo).animationName==='nwVigilHalo';
    if(getComputedStyle(root.querySelector('.nw-synthesis')).borderLeftWidth!=='0px') throw new Error('Unexpected synthesis stripe');
    const before=halo.getAnimations()[0]?.currentTime;
    await new Promise(r=>setTimeout(r,150));
    const advancing=halo.getAnimations()[0]?.currentTime>before;
    return {animated,advancing};
  });
  assert.equal(haloMotion.animated,true,'Circle and halo animation enabled');assert.equal(haloMotion.advancing,true,'Halo animation actually advances');
  await page.emulateMedia({reducedMotion:'reduce'});
  haloMotion.reduced=await page.evaluate(()=>[...window.briefCard.shadowRoot.querySelectorAll('.nw-b-vigil-mark,.nw-b-vigil-halo')].every(e=>getComputedStyle(e).animationName==='none'));
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
    await page.locator('niak-weather-card #today .nw-atmo-grid').screenshot({path:`${out}/atmo-discs-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.evaluate(()=>{window.briefCard.scrollIntoView({block:'start'});window.briefCard.shadowRoot.querySelector('.nw-synthesis-info-button').click();});
    const overlay=await page.evaluate(()=>{
      const root=window.briefCard.shadowRoot,host=root.querySelector('#heros').getBoundingClientRect(),panel=root.querySelector('.nw-brief-panel').getBoundingClientRect();
      return {fullWidth:Math.abs(host.width-panel.width)<2,withinViewport:panel.left>=0&&panel.right<=innerWidth&&panel.bottom<=innerHeight,aboveContent:root.querySelector('.nw-brief-panel').matches(':popover-open')};
    });assert.deepEqual(overlay,{fullWidth:true,withinViewport:true,aboveContent:true},'Full-width, viewport-bounded synthesis overlay');
    await page.locator('niak-weather-card .nw-brief-panel').screenshot({path:`${out}/brief-details-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.evaluate(()=>{window.briefCard.shadowRoot.querySelector('.nw-brief-panel').hidePopover();});
    if(width===375){
      await page.setViewportSize({width,height:640});
      await page.evaluate(()=>{window.briefCard.scrollIntoView({block:'start'});window.briefCard.shadowRoot.querySelector('.nw-synthesis-info-button').click();});
      const scrollBefore=await page.evaluate(()=>scrollY);
      await page.locator('niak-weather-card .nw-brief-panel').hover();await page.mouse.wheel(0,800);await page.waitForTimeout(80);
      const smallScreen=await page.evaluate(()=>{const p=window.briefCard.shadowRoot.querySelector('.nw-brief-panel'),r=p.getBoundingClientRect(),close=p.querySelector('.nw-brief-panel-heading button').getBoundingClientRect();return {inside:r.top>=0&&r.bottom<=innerHeight,scrolls:p.scrollTop>0,pageY:scrollY,closeVisible:close.top>=r.top&&close.bottom<=r.bottom};});
      assert.equal(smallScreen.inside,true,'Synthesis overlay fits a short mobile viewport');assert.equal(smallScreen.scrolls,true,'Long synthesis content scrolls within overlay');assert.equal(smallScreen.pageY,scrollBefore,'Overlay scrolling does not scroll the underlying page');
      assert.equal(smallScreen.closeVisible,true,'Close button stays visible while overlay content scrolls');
      await page.locator('niak-weather-card .nw-brief-panel').screenshot({path:`${out}/brief-overlay-short-mobile-${dark?'dark':'light'}.png`,animations:'disabled'});
      await page.evaluate(()=>window.briefCard.shadowRoot.querySelector('.nw-brief-panel').hidePopover());
    }
    const axe=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[],'Brief structural accessibility');
    briefReports.push({width,dark,overflow,accessibility:'structural scan passed; new hero has no committed visual baseline yet'});
  }
  assert.deepEqual(errors,[],'browser console/network');
  const editorPerformance=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms)), root=document.querySelector('main');root.replaceChildren();
    const states={...window.fixture.states};
    for(let i=0;i<3000;i++) states[`sensor.other_${i}`]={entity_id:`sensor.other_${i}`,state:'1',attributes:{device_class:'power',unit_of_measurement:'W'}};
    let registry=[],registryReads=0;
    const hass={states,language:'fr',callWS:async msg=>{
      if(msg.type==='config/entity_registry/list'){registryReads++;return registry;}
      return {};
    }};
    const config={type:'custom:niak-weather-card',weather_entity:'weather.test',location:'Gardanne'};
    const editor=document.createElement('niak-weather-card-editor'),card=document.createElement('niak-weather-card');
    let events=0;editor.addEventListener('config-changed',()=>events++);
    editor.setConfig(config);editor.hass=hass;card.setConfig(config);card.hass=hass;root.append(editor,card);await sleep(60);
    const noMountWrites=events===0, lazyForms=editor.shadowRoot.querySelectorAll('ha-form').length===2;
    editor.hass={...hass};await editor.updateComplete;
    let editorRenders=0,cardRenders=0;
    const er=editor.render.bind(editor),cr=card.render.bind(card);
    editor.render=()=>{editorRenders++;return er();};card.render=()=>{cardRenders++;return cr();};
    const start=performance.now();
    for(let i=0;i<100;i++){
      const next={...hass,states:{...states,'sensor.other_0':{...states['sensor.other_0'],state:String(i)}}};
      editor.hass=next;card.hass=next;await Promise.all([editor.updateComplete,card.updateComplete]);
    }
    const unrelatedMs=Math.round(performance.now()-start);
    const unrelatedEditorRenders=editorRenders,unrelatedCardRenders=cardRenders;
    let forecastRequests=0;
    const countHass={...hass,callWS:async msg=>{if(msg.type==='call_service') forecastRequests++;return {};}};
    card.hass=countHass;card.setConfig({...config,weather_entity:'weather.second'});await sleep(20);
    const before=forecastRequests;
    for(let i=0;i<5;i++){card.setConfig({...config,weather_entity:'weather.second',location:`Lieu ${i}`});await card.updateComplete;}
    const cosmeticNoRequests=forecastRequests===before;
    editor.addEventListener('config-changed',event=>{editor.setConfig(event.detail.config);card.setConfig(event.detail.config);});
    const weatherForm=editor.shadowRoot.querySelector('ha-form[data-category="weather"]');
    const generalForm=editor.shadowRoot.querySelector('ha-form[data-category="general"]');
    const schemaBefore=weatherForm.schema,generalData=generalForm.data,generalSchema=generalForm.schema;
    const typingStart=performance.now();
    for(const text of ['M','Mé','Mét','Mété','Météo','Météo-France']) {
      weatherForm.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...weatherForm.data,forecast_source:text}},bubbles:true,composed:true}));
      await Promise.all([editor.updateComplete,card.updateComplete]);
    }
    const typingMs=Math.round(performance.now()-typingStart);
    const stableTypingSelectors=weatherForm.schema===schemaBefore&&generalForm.schema===generalSchema&&generalForm.data===generalData&&editor.config.forecast_source==='Météo-France'&&!editor.schemaCache.has('station');
    const beforeSources=forecastRequests;
    card.setConfig({...card.config,wind_speed_entity:'sensor.other_wind',pressure_entity:'sensor.other_pressure',daily_rain_entity:'sensor.other_rain'});await card.updateComplete;await sleep(20);
    const sourceEditsNoForecasts=forecastRequests===beforeSources;
    const pressureId='sensor.saved_pressure';
    card.setConfig({...card.config,pressure_entity:pressureId});await card.updateComplete;await sleep(20);
    card.history={[pressureId]:[{s:'1000',lu:Date.now()/1000-10800}]};
    card.setConfig({...card.config,wind_speed_entity:'sensor.another_wind'});
    const retainedPressure=card.history[pressureId]?.length===1;
    editor.hass=hass;
    editor.shadowRoot.querySelector('details[data-category="atmo"]').open=true;await sleep(20);
    const addAir=id=>{
      states[id]={entity_id:id,state:'3',attributes:{'Nom de la zone':'Gardanne','Type de zone':'Commune'}};
      registry=[{entity_id:id,platform:'atmofrance',original_name:'Qualité globale-Gardanne',config_entry_id:'atmo'}];
    };
    addAir('sensor.atmo_old');
    editor.shadowRoot.querySelector('button[data-fill="atmo"]').click();await sleep(30);
    const initial=editor.shadowRoot.querySelector('ha-form[data-category="atmo"]').data.atmo_air_entity==='sensor.atmo_old';
    delete states['sensor.atmo_old'];addAir('sensor.atmo_new');
    editor.shadowRoot.querySelector('button[data-fill="atmo"]').click();await sleep(30);
    const repaired=editor.shadowRoot.querySelector('ha-form[data-category="atmo"]').data.atmo_air_entity==='sensor.atmo_new';
    return {noMountWrites,lazyForms,editorRenders:unrelatedEditorRenders,cardRenders:unrelatedCardRenders,unrelatedMs,typingMs,stableTypingSelectors,sourceEditsNoForecasts,retainedPressure,cosmeticNoRequests,initial,repaired,registryReads};
  });
  for(const key of ['noMountWrites','lazyForms','cosmeticNoRequests','stableTypingSelectors','sourceEditsNoForecasts','retainedPressure','initial','repaired']) assert.equal(editorPerformance[key],true,`Editor performance: ${key}`);
  assert.equal(editorPerformance.editorRenders,0,'No selector rebuilding on unrelated state updates');
  assert.equal(editorPerformance.cardRenders,0,'No preview rebuilding on unrelated state updates');
  assert.equal(editorPerformance.registryReads,3,'Registry refreshed on each category fill');
  const displayOptions=await page.evaluate(async()=>{
    const root=document.querySelector('main');root.replaceChildren();
    const card=document.createElement('niak-weather-card');window.minimalCard=card;
    const config={type:'custom:niak-weather-card',weather_entity:'weather.test',smart_brief:false};window.minimalConfig=config;
    const weather={entity_id:'weather.test',state:'partlycloudy',attributes:{friendly_name:'Gardanne',attribution:'Météo-France',temperature:26.4,temperature_unit:'°C',wind_speed:12,wind_gust_speed:22,wind_bearing:90,wind_speed_unit:'km/h',pressure:1011,pressure_unit:'hPa'}};
    card.setConfig(config);card.hass={states:{'weather.test':weather},language:'fr',callWS:async()=>({})};root.append(card);await card.updateComplete;
    const shadow=card.shadowRoot;
    const noDuplicate=!shadow.querySelector('.nw-b-vigil,.nw-b-headline,.nw-b-chips,.nw-b-tiles,.nw-brief-details') && shadow.querySelectorAll('.nw-current-condition').length===1;
    const noFakeComfort=!shadow.querySelector('#comfort') && !shadow.querySelector('#today').textContent.includes('Ressenti');
    const providerFrames=shadow.querySelectorAll('.nw-history-source').length===3 && [...shadow.querySelectorAll('.nw-history-source,.nw-current-temperature-source')].every(e=>e.textContent==='Météo-France');
    const truthfulRain=shadow.querySelector('[aria-label="Bilan pluie"]').textContent.includes('Temps sec') && !shadow.querySelector('[aria-label="Bilan pluie"]').textContent.includes('Depuis minuit');
    const separateProviderWind=shadow.querySelector('[aria-label="Bilan vent"]').textContent.includes('Vent moyen maintenant')&&shadow.querySelector('[aria-label="Bilan vent"]').textContent.includes('Rafales maintenant')&&shadow.querySelector('.nw-wind-direction').textContent.includes('E · 90°');
    let switches=true;
    for(let mask=0;mask<8;mask++){
      card.setConfig({...config,show_synthesis:!!(mask&1),show_today:!!(mask&2),show_predictions:!!(mask&4)});await card.updateComplete;
      switches &&= !!shadow.querySelector('#heros')===!!(mask&1) && !!shadow.querySelector('#today')===!!(mask&2) && !!shadow.querySelector('#predictions')===!!(mask&4);
    }
    const editor=document.createElement('niak-weather-card-editor');editor.setConfig({...config,show_today:false});editor.hass=card.hass;root.append(editor);await editor.updateComplete;
    const form=editor.shadowRoot.querySelector('ha-form[data-category="general"]');
    const controls=['show_synthesis','show_bulletin','show_today','show_predictions'].every(name=>form.schema.some(s=>s.name===name&&s.selector.boolean));
    const persisted=form.data.show_today===false;editor.remove();
    const noModeControl=!form.schema.some(s=>s.name==='mode');
    // Daily bulletin: four period tiles from a day of hourly forecasts, hidden by its own switch.
    const day=Array.from({length:30},(_,i)=>({datetime:new Date(Date.now()+(i+1)*3600000).toISOString(),temperature:18,precipitation:0,condition:'sunny'}));
    card.hass={...card.hass,config:{time_zone:'Europe/Paris'},callWS:async m=>m.type==='call_service'?{response:{'weather.test':{forecast:day}}}:{}};
    card.setConfig({...config});card.forecastAt=0;await card.loadForecasts();await card.updateComplete;
    const tiles=()=>shadow.querySelectorAll('.nw-b-tiles li').length;
    const bulletinShown=tiles()===4&&shadow.querySelector('.nw-b-kicker')?.textContent==='Bulletin du jour';
    card.setConfig({...config,show_bulletin:false});await card.updateComplete;
    const bulletinHidden=tiles()===0&&!shadow.querySelector('.nw-b-kicker')&&!!shadow.querySelector('.nw-current-temperature');
    card.hass={...card.hass,callWS:async()=>({})};
    card.setConfig({...config,show_predictions:false});card.forecastAt=0;await card.loadForecasts();await card.updateComplete;
    return {noDuplicate,noFakeComfort,providerFrames,truthfulRain,separateProviderWind,switches,controls,persisted,noModeControl,bulletinShown,bulletinHidden};
  });
  for(const [key,value] of Object.entries(displayOptions))assert.equal(value,true,`Display options: ${key}`);
  for(const dark of [false,true])for(const width of [375,1440]){
    await page.setViewportSize({width,height:1100});
    await page.evaluate(dark=>{
      document.documentElement.style.setProperty('--primary-text-color',dark?'#e4e4e4':'#20203f');
      document.documentElement.style.setProperty('--secondary-text-color',dark?'#aaa':'#686878');
      document.documentElement.style.setProperty('--card-background-color',dark?'#242424':'#fff4f4');
    },dark);
    const overflow=await page.evaluate(()=>window.minimalCard.scrollWidth>window.minimalCard.clientWidth+1);assert.equal(overflow,false,'Minimal card overflow');
    await page.locator('niak-weather-card').screenshot({path:`${out}/weather-only-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
  }
  const compactAndMissing=await page.evaluate(async()=>{
    const root=document.querySelector('main');root.replaceChildren();
    const card=document.createElement('niak-weather-card');
    const states={'weather.test':{entity_id:'weather.test',state:'unavailable',attributes:{}},'sensor.old':{entity_id:'sensor.old',state:'unavailable',attributes:{t_ext:40,ressenti:48,vent:90,pluie_taux:12}}};
    card.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.test',mode:'compact',temperature_entity:'sensor.missing_temperature',wind_speed_entity:'sensor.missing_wind',rain_rate_entity:'sensor.missing_rain',pressure_entity:'sensor.missing_pressure'});
    card.hass={states,callWS:async()=>({})};root.append(card);await new Promise(r=>setTimeout(r,30));
    const shadow=card.shadowRoot;
    const twoSections=shadow.querySelectorAll('#container>.nw-section').length===2&&!shadow.querySelector('#predictions');
    const fourTiles=!shadow.querySelector('.me-tu')&&shadow.querySelectorAll('.nw-history-card').length===3;
    const noStale=![...shadow.querySelectorAll('#today .me-tuv,#today .nw-feels-value,#today .nw-history-value strong')].some(e=>/^(48|40)(?:\D|$)/.test(e.textContent.trim()));
    const missing=shadow.querySelector('#today').textContent.includes('indisponible');
    const migrated=!('mode' in card.config)&&card.config.show_predictions===false;
    card.setConfig({...card.config,show_predictions:true});await card.updateComplete;
    const reenabled=!!shadow.querySelector('#predictions');
    const editor=document.createElement('niak-weather-card-editor');
    editor.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.test',mode:'compact'});
    editor.hass=card.hass;root.append(editor);await editor.updateComplete;
    const form=editor.shadowRoot.querySelector('ha-form[data-category="general"]');
    const editorMigrated=form.data.show_predictions===false&&!('mode' in form.data);
    let emitted;
    editor.addEventListener('config-changed',e=>{emitted=e.detail.config;});
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,show_predictions:true}},bubbles:true,composed:true}));
    const savesWithoutMode=emitted?.show_predictions===true&&!('mode' in emitted);
    editor.remove();
    return {twoSections,fourTiles,noStale,missing,migrated,reenabled,editorMigrated,savesWithoutMode};
  });
  for(const [test,passed] of Object.entries(compactAndMissing))assert.equal(passed,true,`Compact/missing: ${test}`);
  await page.setViewportSize({width:375,height:1300});
  const gaugeEdges=await page.evaluate(async()=>{
    const root=document.querySelector('main');root.replaceChildren();const card=document.createElement('niak-weather-card');
    card.setConfig({...window.fixture.config,show_predictions:false,smart_brief:false});root.append(card);
    for(const value of [-20,55]){
      const states={...window.fixture.states,'sensor.model':{...window.fixture.states['sensor.model'],attributes:{...window.fixture.states['sensor.model'].attributes,ressenti:value}}};
      card.hass={states,callWS:async()=>({})};await new Promise(r=>setTimeout(r,25));
      const frame=card.shadowRoot.querySelector('#comfort').getBoundingClientRect(), label=card.shadowRoot.querySelector('.nw-feels-value').getBoundingClientRect();
      if(label.left<frame.left||label.right>frame.right)return false;
    }
    return true;
  });
  assert.equal(gaugeEdges,true,'Extreme feel values stay within frame on mobile');
  await page.evaluate(()=>{
    window.comfortInfoPopups=0;
    document.querySelector('niak-weather-card').addEventListener('hass-more-info',()=>window.comfortInfoPopups++);
  });
  const comfortSummary=page.locator('.nw-comfort-info>summary');
  await comfortSummary.click();
  assert.equal(await page.evaluate(()=>document.querySelector('niak-weather-card').shadowRoot.querySelector('.nw-comfort-info').open),true,'Comfort help opens on click');
  const comfortHelp=await page.evaluate(()=>{
    const info=document.querySelector('niak-weather-card').shadowRoot.querySelector('.nw-comfort-info');
    const link=info.querySelector('a');
    link.addEventListener('click',e=>e.preventDefault(),{once:true});link.click();
    return {brief:info.textContent.includes('pas un indice météo officiel'),
      example:/En ce moment : .* = .* °C ressentis/.test(info.textContent.replace(/\s+/g,' ')),
      link:link.href==='https://github.com/Niakman13/niak-weather#expliquer-le-ressenti'&&link.target==='_blank'&&link.rel.includes('noopener'),
      noPopup:window.comfortInfoPopups===0};
  });
  for(const [key,value] of Object.entries(comfortHelp))assert.equal(value,true,`Comfort help: ${key}`);
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:1300});
    assert.equal(await page.evaluate(()=>{const c=document.querySelector('niak-weather-card');return c.scrollWidth>c.clientWidth+1;}),false,'Comfort help fits the card');
    await page.locator('#comfort').screenshot({path:`${out}/comfort-info-${width}.png`,animations:'disabled'});
  }
  await comfortSummary.focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.querySelector('niak-weather-card').shadowRoot.querySelector('.nw-comfort-info').open),false,'Comfort help closes with keyboard');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.querySelector('niak-weather-card').shadowRoot.querySelector('.nw-comfort-info').open),true,'Comfort help reopens with keyboard');
  assert.equal(await page.evaluate(()=>window.comfortInfoPopups),0,'Comfort help never opens weather more-info');
  // Current-weather scenes are independent of the future brief. Real bundled element, nested shadow DOM.
  const skyBehavior=await page.evaluate(async()=>{
    const root=document.querySelector('main');root.replaceChildren();
    const card=document.createElement('niak-weather-card');window.skyCard=card;
    card.setConfig({...window.fixture.config,smart_brief:true});
    const states={...window.fixture.states,'sun.sun':{entity_id:'sun.sun',state:'above_horizon',attributes:{elevation:40}}};
    card.hass={states,language:'fr',callWS:async()=>({})};root.append(card);await card.updateComplete;
    const sky=card.shadowRoot.querySelector('niak-weather-sky');await sky.updateComplete;
    const form=document.createElement('niak-weather-card-editor');form.setConfig(window.fixture.config);form.hass=card.hass;root.append(form);await form.updateComplete;
    const schema=form.shadowRoot.querySelector('ha-form[data-category="general"]').schema;
    const settings=schema.some(s=>s.name==='weather_animations')&&schema.some(s=>s.name==='weather_animation_quality');form.remove();
    return {condition:sky.condition,temperature:card.shadowRoot.querySelector('.nw-current-temperature').textContent.trim(),settings};
  });
  assert.equal(skyBehavior.condition,'partlycloudy');assert.ok(skyBehavior.temperature.includes('20,8'));assert.equal(skyBehavior.settings,true);
  const skyScenes=[];
  for(const condition of ['sunny','clear-night','partlycloudy','cloudy','rainy','pouring','lightning','lightning-rainy','snowy','snowy-rainy','hail','fog','windy','windy-variant','exceptional','unavailable']) {
    const scene=await page.evaluate(async condition=>{
      const card=window.skyCard;
      const rain=['rainy','lightning-rainy'].includes(condition)?1.4:condition==='pouring'?7:0;
      const states={...card.hass.states,'weather.test':{...card.hass.states['weather.test'],state:condition},'sensor.pluie_taux':{entity_id:'sensor.pluie_taux',state:String(rain),attributes:{unit_of_measurement:'mm/h'}},'sun.sun':{entity_id:'sun.sun',state:condition==='clear-night'?'below_horizon':'above_horizon',attributes:{elevation:condition==='clear-night'?-20:40}}};
      card.hass={...card.hass,states};await card.updateComplete;const sky=card.shadowRoot.querySelector('niak-weather-sky');await sky.updateComplete;
      return {condition:sky.condition,label:card.shadowRoot.querySelector('.nw-current-condition').textContent.trim(),particles:sky.shadowRoot.querySelectorAll('.particle').length,
        neutral:sky.shadowRoot.querySelectorAll('.cloud,.orb,.particle,.bolt').length===0};
    },condition);
    assert.equal(scene.condition,condition==='unavailable'?'unknown':condition);
    if(condition==='unavailable')assert.equal(scene.neutral,true);skyScenes.push(scene);
    if(['sunny','clear-night','rainy','snowy','fog','lightning-rainy'].includes(condition)) {
      await page.setViewportSize({width:1440,height:1500});
      await page.locator('niak-weather-card #heros').screenshot({path:`${out}/sky-scene-${condition}.png`,animations:'disabled'});
    }
  }
  // Restore clear skies; forward storm in the forecast must not turn the current sky into an orage.
  await page.evaluate(async()=>{
    const card=window.skyCard;card.hass={...card.hass,states:{...card.hass.states,'weather.test':{...card.hass.states['weather.test'],state:'partlycloudy'}}};await card.updateComplete;
  });
  const currentReports=[];
  for(const dark of [false,true])for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1500});
    await page.evaluate(dark=>{
      document.documentElement.style.setProperty('--primary-text-color',dark?'#e4e4e4':'#20203f');
      document.documentElement.style.setProperty('--secondary-text-color',dark?'#aaa':'#686878');
      document.documentElement.style.setProperty('--card-background-color',dark?'#242424':'#fff4f4');
    },dark);
    const geometry=await page.evaluate(()=>{
      const root=window.skyCard.shadowRoot, host=window.skyCard.getBoundingClientRect(), current=root.querySelector('.nw-current-content').getBoundingClientRect(), lead=root.querySelector('.nw-b-main')?.getBoundingClientRect();
      return {overflow:current.left<host.left||current.right>host.right,distinct:!lead||current.left>=lead.right||current.top>=lead.bottom||current.bottom<=lead.top,rightAligned:getComputedStyle(root.querySelector('.nw-current-content')).textAlign==='right'};
    });
    assert.equal(geometry.overflow,false);assert.equal(geometry.distinct,true);assert.equal(geometry.rightAligned,true);
    const background=await page.evaluate(()=>{
      const root=window.skyCard.shadowRoot, header=root.querySelector('#heros'), sky=root.querySelector('niak-weather-sky'), details=root.querySelector('.nw-brief-details');
      const mobile=header.getBoundingClientRect().width<=650;
      const scene=sky.shadowRoot;
      const artwork=()=>[...scene.querySelectorAll('.weather-art,.orb,.cloud,.bolt,.particle,.gust,.stars')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
      const before=mobile?artwork():[];
      const matches=()=>{const h=header.getBoundingClientRect(),s=sky.getBoundingClientRect();return Math.abs(h.right-s.right)<1&&Math.abs(h.top-s.top)<1&&Math.abs(h.bottom-s.bottom)<1&&Math.abs(h.left-s.left)<1;};
      const closed=matches();details.querySelector('.nw-synthesis-info-button').click();const expanded=matches();
      const stable=!mobile||JSON.stringify(before)===JSON.stringify(artwork());
      const main=root.querySelector('.nw-b-main').getBoundingClientRect(),head=root.querySelector('.nw-b-head').getBoundingClientRect();
      return {closed,expanded,clean:!root.querySelector('.nw-current-feels,.nw-current-source'),stable,leftAligned:Math.abs(main.left-head.left)<1&&main.top>=head.bottom};
    });
    assert.deepEqual(background,{closed:true,expanded:true,clean:true,stable:true,leftAligned:true},'Full banner sky, stationary mobile artwork and bulletin aligned under the heading');
    await page.locator('niak-weather-card #heros').screenshot({path:`${out}/current-expanded-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.evaluate(()=>{window.skyCard.shadowRoot.querySelector('.nw-brief-panel').hidePopover();});
    await page.locator('niak-weather-card #heros').screenshot({path:`${out}/current-weather-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    const axe=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[],'Current sky structural accessibility');
    currentReports.push({width,dark,...geometry});
  }
  await page.evaluate(()=>{window.skyInfo=[];window.skyCard.addEventListener('hass-more-info',e=>window.skyInfo.push(e.detail.entityId));});
  await page.locator('niak-weather-card .nw-current-temperature').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.skyInfo.at(-1)),'sensor.t_ext','Current temperature opens its source');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('niak-weather-card #heros').scrollIntoViewIfNeeded();
  const skyMotion=await page.evaluate(async()=>{
    const sky=window.skyCard.shadowRoot.querySelector('niak-weather-sky');await new Promise(r=>setTimeout(r,100));await sky.updateComplete;
    const cloud=sky.shadowRoot.querySelector('.cloud'), before=cloud.getAnimations()[0]?.currentTime;await new Promise(r=>setTimeout(r,150));
    return {running:getComputedStyle(cloud).animationPlayState==='running',advancing:cloud.getAnimations()[0]?.currentTime>before};
  });
  assert.equal(skyMotion.running,true);assert.equal(skyMotion.advancing,true);
  const weatherEffects=await page.evaluate(async()=>{
    const card=window.skyCard;
    const change=async condition=>{const rain=['rainy','lightning-rainy'].includes(condition)?1.4:condition==='pouring'?7:0;card.hass={...card.hass,states:{...card.hass.states,'weather.test':{...card.hass.states['weather.test'],state:condition},'sensor.pluie_taux':{entity_id:'sensor.pluie_taux',state:String(rain),attributes:{unit_of_measurement:'mm/h'}}}};await card.updateComplete;const sky=card.shadowRoot.querySelector('niak-weather-sky');await sky.updateComplete;return sky.shadowRoot;};
    let scene=await change('rainy');const rainCount=scene.querySelectorAll('.rain').length, rain=scene.querySelector('.rain');
    const before=getComputedStyle(rain).translate;await new Promise(r=>setTimeout(r,180));const falling=getComputedStyle(rain).translate!==before;
    const regularDuration=parseFloat(getComputedStyle(rain).animationDuration);
    scene=await change('pouring');const heavier=scene.querySelectorAll('.rain').length>rainCount&&parseFloat(getComputedStyle(scene.querySelector('.rain')).animationDuration)<regularDuration;
    scene=await change('lightning-rainy');const bolt=scene.querySelector('.bolt'), animation=bolt.getAnimations()[0];animation.pause();animation.currentTime=80;
    const bright=parseFloat(getComputedStyle(bolt).opacity);animation.currentTime=1200;const dark=parseFloat(getComputedStyle(bolt).opacity);animation.play();
    scene=await change('windy');const gust=scene.querySelector('.gust'),start=getComputedStyle(gust).translate;await new Promise(r=>setTimeout(r,180));
    const windMoves=getComputedStyle(gust).translate!==start&&scene.querySelectorAll('.leaf').length>0;
    await change('partlycloudy');return {falling,heavier,lightning:bright>.8&&dark===0,windMoves};
  });
  for(const [key,value] of Object.entries(weatherEffects))assert.equal(value,true,`Weather animation: ${key}`);
  await page.emulateMedia({reducedMotion:'reduce'});
  // Autumn leaves fly in storms too; only snow and hail hide them.
  const autumnLeaves=await page.evaluate(async()=>{
    const sky=document.createElement('niak-weather-sky');sky.season='autumn';sky.phase='day';document.body.append(sky);
    const count=async condition=>{sky.condition=condition;await sky.updateComplete;return sky.shadowRoot.querySelectorAll('.maple').length;};
    const result={storm:await count('lightning-rainy')>0,rain:await count('rainy')>0,snow:await count('snowy')===0,gusty:!!sky.shadowRoot.querySelector('.drift--gusty')||(await count('lightning'),!!sky.shadowRoot.querySelector('.drift--gusty'))};
    sky.remove();return result;
  });
  for(const [key,value] of Object.entries(autumnLeaves))assert.equal(value,true,`Autumn leaves: ${key}`);
  skyMotion.reduced=await page.evaluate(()=>getComputedStyle(window.skyCard.shadowRoot.querySelector('niak-weather-sky').shadowRoot.querySelector('.cloud')).animationName==='none');assert.equal(skyMotion.reduced,true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async()=>{const card=window.skyCard;card.setConfig({...window.fixture.config,weather_animations:false});await card.updateComplete;});
  skyMotion.disabled=await page.evaluate(()=>getComputedStyle(window.skyCard.shadowRoot.querySelector('niak-weather-sky').shadowRoot.querySelector('.cloud')).animationName==='none');assert.equal(skyMotion.disabled,true);
  await page.evaluate(async()=>{const card=window.skyCard;card.setConfig({...window.fixture.config,weather_animations:true,weather_animation_quality:'low'});card.hass={...card.hass,states:{...card.hass.states,'weather.test':{...card.hass.states['weather.test'],state:'rainy'},'sensor.pluie_taux':{entity_id:'sensor.pluie_taux',state:'1.4',attributes:{unit_of_measurement:'mm/h'}}}};await card.updateComplete;});
  assert.equal(await page.evaluate(()=>window.skyCard.shadowRoot.querySelector('niak-weather-sky').shadowRoot.querySelectorAll('.particle').length),8,'Low-quality particle count');
  skyMotion.hidden=await page.evaluate(async()=>{
    const descriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    try {
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
      const sky=window.skyCard.shadowRoot.querySelector('niak-weather-sky');await sky.updateComplete;
      return getComputedStyle(sky.shadowRoot.querySelector('.cloud')).animationPlayState==='paused';
    } finally {if(descriptor)Object.defineProperty(document,'hidden',descriptor);else delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));}
  });assert.equal(skyMotion.hidden,true,'Hidden page pauses sky animations');
  await page.evaluate(()=>{window.skyCard.style.marginTop='2200px';});
  // IntersectionObserver fires asynchronously: wait for the pause instead of a fixed delay (slow CI runners).
  skyMotion.offscreen=await page.waitForFunction(()=>getComputedStyle(window.skyCard.shadowRoot.querySelector('niak-weather-sky').shadowRoot.querySelector('.cloud')).animationPlayState==='paused',null,{timeout:3000}).then(()=>true,()=>false);assert.equal(skyMotion.offscreen,true,'Off-screen card pauses sky animations');
  const recentDetails=await page.evaluate(async()=>{
    document.querySelector('main').replaceChildren();
    const card=document.createElement('niak-weather-card');window.detailsCard=card;
    const now=Date.now(), day=86400_000;
    const e=(entity_id,state,unit)=>({entity_id,state:String(state),attributes:{unit_of_measurement:unit}});
    const states={...window.fixture.states,'sensor.rain24':e('sensor.rain24',0,'mm'),'sensor.year':e('sensor.year',536.9,'mm'),'sensor.maximum':e('sensor.maximum',30,'km/h'),'sensor.direction':e('sensor.direction',225,'°'),'sensor.pression':e('sensor.pression',1010.4,'hPa')};
    states['sensor.pluie_jour']=e('sensor.pluie_jour',0,'mm');states['sensor.pluie_semaine']=e('sensor.pluie_semaine',0,'mm');states['sensor.pluie_mois']=e('sensor.pluie_mois',20.8,'mm');states['sensor.rafales']=e('sensor.rafales',14,'km/h');
    const rain=[];
    for(let i=8;i>=0;i--){const d=new Date(now-i*day);d.setUTCHours(0,0,0,0);rain.push({s:'0',lu:d.getTime()/1000});if(i>=3&&i<=5)rain.push({s:String([1.2,5.6,2][i-3]),lu:d.getTime()/1000+36000});}
    const gust=Array.from({length:37},(_,i)=>({s:String(i===12?30:i===36?14:10+(i%6)*2),lu:(now-21600_000+i*600_000)/1000}));
    const mean=gust.map(p=>({...p,s:String(Number(p.s)*.55)}));
    const pressure=gust.map((p,i)=>({...p,s:String(1014-i*.1)}));
    let requests=0;const requested=[];
    const config={...window.fixture.config,show_synthesis:false,show_predictions:false,rain_24h_entity:'sensor.rain24',yearly_rain_entity:'sensor.year',max_daily_gust_entity:'sensor.maximum',wind_bearing_entity:'sensor.direction'};
    card.setConfig(config);card.hass={states,language:'fr',config:{time_zone:'Europe/Paris'},callWS:async msg=>{
      if(msg.type!=='history/history_during_period')return {};
      requests++;requested.push(msg);
      return msg.entity_ids.includes('sensor.pluie_jour')?{'sensor.pluie_jour':rain}:{'sensor.rafales':gust,[config.wind_speed_entity]:mean,[config.pressure_entity]:pressure};
    }};document.querySelector('main').append(card);await new Promise(r=>setTimeout(r,80));
    const root=card.shadowRoot;
    const twoCards=root.querySelectorAll('.nw-history-card').length===3&&!root.querySelector('.me-tu');
    const charts=root.querySelectorAll('.nw-history-chart svg').length===3;
    const collapsedByDefault=[...root.querySelectorAll('.nw-statistics')].length===3&&[...root.querySelectorAll('.nw-statistics')].every(e=>!e.open);
    root.querySelector('.nw-statistics summary').click();
    const independentStatistics=root.querySelector('.nw-statistics').open&&[...root.querySelectorAll('.nw-statistics')].slice(1).every(e=>!e.open);
    const heights=[...root.querySelectorAll('.nw-history-card')].map(e=>e.getBoundingClientRect());
    const equalHeightWithOneExpanded=heights.every(a=>heights.every(b=>Math.abs(a.top-b.top)>1||Math.abs(a.height-b.height)<1));
    root.querySelector('.nw-statistics').open=false;
    const windDirection=!!root.querySelector('.nw-wind-direction .me-rose')&&!root.querySelector('.nw-wind-direction').closest('details')&&getComputedStyle(root.querySelector('.nw-wind-direction .me-aigp')).fill==='rgb(40, 130, 240)'&&root.querySelector('.nw-wind-direction').textContent.includes('SO · 225°');
    const compactSummary=!root.querySelector('.nw-history-card footer')&&!root.querySelector('.nw-pressure-context')&&!!root.querySelector('.nw-wind-headline .nw-wind-direction')&&!root.querySelector('.nw-wind-headline').textContent.includes('Rafale max. du jour')&&!!root.querySelector('.nw-statistics [data-entity="sensor.maximum"]');
    const directionDivider=getComputedStyle(root.querySelector('.nw-wind-direction')).borderLeftWidth==='1px';
    const complementaryWind=!!root.querySelector('.nw-wind-curve--gust')&&root.querySelector('.nw-wind-headline').textContent.includes('Vent moyen maintenant')&&root.querySelector('.nw-wind-headline').textContent.includes('Rafales maintenant');
    const matchingBackground=getComputedStyle(root.querySelector('.nw-history-card')).backgroundColor===getComputedStyle(root.querySelector('#comfort')).backgroundColor;
    const noRelativeBars=!root.querySelector('#bilan .me-blb');
    const honestScale=root.querySelector('.nw-wind-scale').textContent.includes('80 km/h')&&root.querySelector('.nw-wind-marker--max').style.left==='37.5%';
    const noFakeZero=[...root.querySelectorAll('.nw-history-chart rect')].every(r=>Number(r.getAttribute('height'))>0)&&root.querySelectorAll('.nw-history-chart rect').length===3;
    const splitRequests=requested.length===2&&requested.some(m=>m.entity_ids.length===1&&m.entity_ids[0]==='sensor.pluie_jour')&&requested.some(m=>m.entity_ids.includes('sensor.rafales'));
    const before=requests;card.setConfig({...config,location:'Nouveau lieu'});await card.updateComplete;await new Promise(r=>setTimeout(r,20));
    const cached=requests===before;
    let clicked;card.addEventListener('hass-more-info',e=>clicked=e.detail.entityId);
    root.querySelector('.nw-rain-counters button').click();
    const sourceClick=clicked==='sensor.pluie_semaine';
    return {twoCards,charts,collapsedByDefault,independentStatistics,equalHeightWithOneExpanded,windDirection,compactSummary,directionDivider,complementaryWind,matchingBackground,noRelativeBars,honestScale,noFakeZero,splitRequests,cached,sourceClick};
  });
  for(const [key,value] of Object.entries(recentDetails))assert.equal(value,true,`Recent details: ${key}`);
  for(const dark of [false,true])for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1600});
    await page.evaluate(dark=>{
      document.documentElement.style.setProperty('--primary-text-color',dark?'#e4e4e4':'#20203f');
      document.documentElement.style.setProperty('--secondary-text-color',dark?'#aaa':'#686878');
      document.documentElement.style.setProperty('--card-background-color',dark?'#303744':'#fff');
    },dark);
    const layout=await page.evaluate(()=>{const root=window.detailsCard.shadowRoot,host=window.detailsCard.getBoundingClientRect(),cards=[...root.querySelectorAll('.nw-history-card')];return {overflow:cards.some(e=>e.scrollWidth>e.clientWidth+1||e.getBoundingClientRect().right>host.right+1),columns:getComputedStyle(root.querySelector('.nw-history-grid')).gridTemplateColumns.split(' ').length};});
    assert.equal(layout.overflow,false,`History details fit ${width}px`);
    assert.equal(layout.columns,width===375?1:width===1440?3:2,`History detail columns ${width}px`);
    const alignedHeight=()=>page.evaluate(()=>{const rows=[...window.detailsCard.shadowRoot.querySelectorAll('.nw-history-card')].map(e=>e.getBoundingClientRect());return rows.every(a=>rows.every(b=>Math.abs(a.top-b.top)>1||Math.abs(a.height-b.height)<1));});
    assert.equal(await alignedHeight(),true,`Collapsed detail cards have equal row heights at ${width}px`);
    await page.locator('#bilan').screenshot({path:`${out}/recent-details-collapsed-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.evaluate(()=>window.detailsCard.shadowRoot.querySelectorAll('.nw-statistics').forEach(e=>e.open=true));
    assert.equal(await alignedHeight(),true,`Expanded detail cards have equal row heights at ${width}px`);
    await page.locator('#bilan').screenshot({path:`${out}/recent-details-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
    await page.evaluate(()=>window.detailsCard.shadowRoot.querySelectorAll('.nw-statistics').forEach(e=>e.open=false));
  }
  const missingDetails=await page.evaluate(async()=>{
    const card=window.detailsCard;
    card.setConfig({...card.config,daily_rain_entity:'sensor.no_history',wind_speed_entity:'sensor.no_wind_history',wind_gust_entity:'sensor.no_gust_history',pressure_entity:'sensor.no_pressure_history'});
    card.hass={...card.hass,callWS:async()=>{throw new Error('Recorder excluded');}};await new Promise(r=>setTimeout(r,60));
    return card.shadowRoot.querySelectorAll('.nw-history-chart svg').length===0&&card.shadowRoot.querySelectorAll('.nw-history-empty').length===3;
  });assert.equal(missingDetails,true,'Missing histories never create artificial charts');
  const rainHistoryRace=await page.evaluate(async()=>{
    const card=document.createElement('niak-weather-card');let resolveOld;
    const e=id=>({entity_id:id,state:'0',attributes:{unit_of_measurement:'mm'}});
    card.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.test',daily_rain_entity:'sensor.old_rain'});
    card.hass={states:{'weather.test':window.fixture.states['weather.test'],'sensor.old_rain':e('sensor.old_rain'),'sensor.new_rain':e('sensor.new_rain')},callWS:async msg=>{
      if(msg.type!=='history/history_during_period')return {};
      if(msg.entity_ids[0]==='sensor.old_rain')return new Promise(resolve=>{resolveOld=resolve;});
      return {'sensor.new_rain':[{s:'0',lu:Date.now()/1000}]};
    }};document.querySelector('main').append(card);await new Promise(r=>setTimeout(r,20));
    card.setConfig({...card.config,daily_rain_entity:'sensor.new_rain'});await new Promise(r=>setTimeout(r,20));
    resolveOld({'sensor.old_rain':[{s:'123',lu:Date.now()/1000}]});await new Promise(r=>setTimeout(r,20));
    const safe=!card.rainHistory['sensor.old_rain']&&!!card.rainHistory['sensor.new_rain'];card.remove();return safe;
  });assert.equal(rainHistoryRace,true,'A stale response cannot overwrite another rain source');
  const stationJourney=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms)),main=document.querySelector('main');main.replaceChildren();
    const prefix='sensor.ws90_',time=Date.now(),day=new Date();day.setUTCHours(0,0,0,0);
    const specs={temperature:['temperature','°C','20'],dew_point:['temperature','°C','15'],humidity:['humidity','%','70'],wind_speed:['wind_speed','m/s','2'],gust_speed:['wind_speed','m/s','4'],wind_direction:['','°','180'],illuminance:['illuminance','lx','1000'],illuminance_raw:['','','30827'],precipitation:['precipitation','mm','12'],rain_rate:['precipitation_intensity','mm/h','0']};
    const states={'weather.test':window.fixture.states['weather.test'],...Object.fromEntries(Object.entries(specs).map(([name,[device_class,unit_of_measurement,state]])=>[prefix+name,{entity_id:prefix+name,state,attributes:{friendly_name:name,device_class,unit_of_measurement,state_class:name==='precipitation'?'total_increasing':'measurement'}}]))};
    let requests=0,resolveStale;
    const entities=Object.keys(specs).map(name=>({entity_id:prefix+name,device_id:'ws90',platform:'mqtt'}));
    const hass={states,language:'fr',config:{time_zone:'UTC'},callWS:async msg=>{
      requests++;
      if(msg.type==='config/entity_registry/list')return entities;
      if(msg.type==='config/device_registry/list')return [{id:'ws90',name:'WS90 MQTT',manufacturer:'Shelly'}];
      if(msg.type==='recorder/get_statistics_metadata')return [{statistic_id:prefix+'precipitation',has_sum:true,statistics_unit_of_measurement:'mm',display_unit_of_measurement:'mm'}];
      if(msg.type==='recorder/statistics_during_period')return {[prefix+'precipitation']:[{start:day.getTime()-86400_000,end:day.getTime(),sum:10,state:10},{start:day.getTime(),end:time-3600_000,sum:11,state:11}]};
      if(msg.type==='history/history_during_period')return Object.fromEntries(msg.entity_ids.map(id=>[id,id===prefix+'precipitation'?[{s:'10',lu:day.getTime()/1000},{s:'11',lu:(time-3600_000)/1000}]:[{s:states[id]?.state??'0',lu:(time-3600_000)/1000}]]));
      return {};
    }};
    const editor=document.createElement('niak-weather-card-editor'),card=document.createElement('niak-weather-card');
    editor.setConfig({type:'custom:niak-weather-card',weather_entity:'weather.test'});editor.hass=hass;main.append(editor);await sleep(30);
    editor.shadowRoot.querySelector('details[data-category="station"]').open=true;await sleep(20);
    editor.addEventListener('config-changed',event=>{editor.setConfig(event.detail.config);card.setConfig(event.detail.config);});
    const form=editor.shadowRoot.querySelector('ha-form[data-category="station"]');
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,station_model:'ws90'}},bubbles:true}));await sleep(60);
    const flatten=items=>items.flatMap(item=>item.schema?flatten(item.schema):[item]);
    const schemas=flatten(form.schema),tempIds=schemas.find(s=>s.name==='temperature_entity').selector.entity.include_entities;
    const deviceForm=editor.shadowRoot.querySelector('ha-form[data-category="station-device"]');
    const modelOptions=deviceForm.schema[0].selector.select.options;
    const result={profile:deviceForm.data.station_model==='ws90',explicitModels:modelOptions.map(o=>o.value).join(',')==='gw2000a,ws90,manual',subjectGroups:form.schema.map(g=>g.title).join(',')==='Température et humidité,Pluie,Vent,Soleil,Spécifiques',ws90Fields:!schemas.some(s=>['weekly_rain_entity','solar_radiation_entity','max_daily_gust_entity'].includes(s.name))&&schemas.some(s=>s.name==='station_history'),prefilled:form.data.illuminance_entity===prefix+'illuminance'&&form.data.rain_total_entity===prefix+'precipitation',strictTemperature:tempIds.join(',')===prefix+'temperature',manualMode:modelOptions.some(o=>o.value==='manual'),deviceFirst:!!(deviceForm.compareDocumentPosition(editor.shadowRoot.querySelector('.station-report'))&Node.DOCUMENT_POSITION_FOLLOWING)};
    form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,temperature_entity:prefix+'dew_point'}},bubbles:true}));await sleep(20);
    result.rejectWrongFunction=editor.config.temperature_entity===prefix+'temperature';
    card.hass=hass;main.append(card);await sleep(60);window.stationDemo={editor,card,hass};
    const rain=card.shadowRoot.querySelector('[aria-label="Bilan pluie"]');
    result.rainComputed=rain.textContent.includes('historique')&&rain.querySelector('.nw-history-headline strong').textContent.includes('2,0');
    result.partialYear=rain.textContent.includes('Cette année · partiel');
    result.noExtraEntities=Object.keys(hass.states).length===Object.keys(states).length;
    const before=requests;card.setConfig({...card.config,location:'Une autre saisie'});await sleep(20);result.cached=requests===before;
    card.setConfig({...card.config,weekly_rain_entity:'sensor.native_week'});card.hass={...hass,states:{...states,'sensor.native_week':{entity_id:'sensor.native_week',state:'99',attributes:{unit_of_measurement:'mm'}}}};await sleep(20);
    result.nativeWins=card.shadowRoot.querySelector('[data-entity="sensor.native_week"] strong').textContent.includes('99,0');
    deviceForm.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{station_model:'manual'}},bubbles:true}));await sleep(20);
    const manualFields=flatten(form.schema);
    result.manualAllFields=manualFields.some(f=>f.name==='solar_radiation_entity')&&manualFields.some(f=>f.name==='weekly_rain_entity')&&manualFields.some(f=>f.name==='station_history')&&editor.config.temperature_entity===prefix+'temperature';
    deviceForm.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{station_model:'ws90'}},bubbles:true}));await sleep(30);
    return result;
  });
  for(const [key,value] of Object.entries(stationJourney))assert.equal(value,true,`Station setup: ${key}`);
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1400});
    const fits=await page.evaluate(()=>{const {editor,card}=window.stationDemo;return [editor,card].every(e=>e.scrollWidth<=e.clientWidth+1);});
    assert.equal(fits,true,`Station editor/card fits ${width}`);
    await page.locator('niak-weather-card-editor details[data-category="station"]').screenshot({path:`${out}/station-editor-${width}.png`});
    await page.locator('niak-weather-card #bilan').screenshot({path:`${out}/station-derived-${width}.png`});
  }
  const relevantBrief=await page.evaluate(async()=>{
    const main=document.querySelector('main');main.replaceChildren();
    const e=(entity_id,state,unit)=>({entity_id,state:String(state),attributes:{unit_of_measurement:unit}});
    const states={'weather.test':{...window.fixture.states['weather.test'],state:'sunny'},'sensor.outdoor':e('sensor.outdoor',20,'°C'),'sensor.humidity':e('sensor.humidity',50,'%'),'sensor.wind':e('sensor.wind',0,'km/h')};
    const card=document.createElement('niak-weather-card');
    const config={type:'custom:niak-weather-card',weather_entity:'weather.test',temperature_entity:'sensor.outdoor',humidity_entity:'sensor.humidity',wind_speed_entity:'sensor.wind',smart_brief:true,show_bulletin:false};
    let dailyRain=0;
    const callWS=async msg=>{
      if(msg.type!=='call_service')return {};
      const today=new Date();today.setUTCHours(12,0,0,0);const tomorrow=new Date(today);tomorrow.setUTCDate(today.getUTCDate()+1);
      const forecast=msg.service_data.type==='daily'?[{datetime:tomorrow.toISOString(),precipitation:dailyRain,temperature:25}]:Array.from({length:6},(_,i)=>({datetime:new Date(Date.now()+(i+1)*3600_000).toISOString(),temperature:20,precipitation:0,condition:'sunny'}));
      return {response:{'weather.test':{forecast}}};
    };
    card.setConfig(config);card.hass={states,language:'fr',config:{time_zone:'UTC'},callWS};main.append(card);await new Promise(r=>setTimeout(r,60));
    const root=card.shadowRoot;
    const empty=!root.querySelector('.nw-b-headline,.nw-b-vigil')&&!!root.querySelector('.nw-current-temperature')&&!!root.querySelector('#comfort');
    // 20 °C at 95 % humidity: the humidex computed by the card is about 27 °C, well above the thermometer.
    card.hass={...card.hass,states:{...states,'sensor.humidity':e('sensor.humidity',95,'%')}};await card.updateComplete;
    const gap=root.querySelector('.nw-b-headline')?.textContent.includes('ressenti est plus élevé')&&!(root.querySelector('.nw-b-chips')?.textContent ?? '').includes('ressentis')&&!root.querySelector('.nw-b-vigil');
    dailyRain=72;card.hass={...card.hass,states};card.forecastAt=0;await card.loadForecasts();await card.updateComplete;
    const tomorrow=root.querySelector('.nw-b-headline')?.textContent.includes('Pluie importante prévue demain : 72 mm')&&!root.querySelector('.nw-b-vigil');
    window.relevantBriefCard=card;return {empty,gap,tomorrow};
  });
  for(const [key,value] of Object.entries(relevantBrief))assert.equal(value,true,`Relevant brief: ${key}`);
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:1000});
    await page.locator('niak-weather-card #heros').screenshot({path:`${out}/brief-relevant-${width}.png`,animations:'disabled'});
  }
  assert.deepEqual(errors,[],'Current sky browser console/network');
  writeFileSync(`${out}/browser-report.json`,JSON.stringify({reports,behavior,atmoBehavior,atmoReports,briefBehavior,briefReports,editorPerformance,stationJourney,relevantBrief,displayOptions,compactAndMissing,gaugeEdges,haloMotion,skyBehavior,skyScenes,currentReports,skyMotion,weatherEffects,recentDetails,missingDetails,errors},null,2));
  console.log(JSON.stringify({reports,behavior,atmoBehavior,atmoReports,briefBehavior,briefReports,editorPerformance,displayOptions,compactAndMissing,gaugeEdges,haloMotion,skyBehavior,skyScenes,currentReports,skyMotion,weatherEffects,recentDetails,missingDetails,errors},null,2));
} finally { await browser.close();server.close(); }

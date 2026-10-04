import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
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
      window.fixture = { states, config:{type:'custom:niak-weather-card',weather_entity:'weather.test',model_entity:'sensor.model',forecast_entity:'sensor.prev',air_quality_entity:'sensor.air',pollens:variables.pollens,location:'Ma commune',forecast_source:'Météo-France',mode:'detailed'} };
      await import('/card.js');
    }, { reference, fixture: fixtures[0], icons: mdi, dark });
    const baseline = await page.locator('#baseline').screenshot({ path:`${out}/original-${width}-${dark?'dark':'light'}.png`, animations:'disabled' });
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('#baseline');
      return Object.fromEntries(['.me-bulle','.me-hv','.me-tu','.me-graph','.me-bl','.me-j'].map(s=>{const e=root.querySelector(s),r=e.getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height,font:getComputedStyle(e).fontSize}]}));
    });
    await page.evaluate(() => {
      document.querySelector('#baseline').remove(); const card = document.createElement('niak-weather-card');
      card.setConfig(window.fixture.config); card.hass = { states:window.fixture.states,language:'fr',config:{time_zone:'Europe/Paris'},callWS:async()=>({}) };
      document.querySelector('main').append(card); window.card=card;
    });
    await page.locator('niak-weather-card .me-bl').first().waitFor();
    const actual = await page.locator('niak-weather-card').screenshot({ path:`${out}/niak-${width}-${dark?'dark':'light'}.png`,animations:'disabled' });
    const a = PNG.sync.read(baseline), b=PNG.sync.read(actual);
    assert.equal(b.width,a.width, 'card width'); assert.equal(b.height,a.height,'card height');
    const diff = new PNG({width:a.width,height:a.height}); const pixels=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.05});
    if (pixels) writeFileSync(`${out}/diff-${width}-${dark?'dark':'light'}.png`,PNG.sync.write(diff));
    const measured=await page.evaluate(()=>{
      const root=window.card.shadowRoot;
      return Object.fromEntries(['.me-bulle','.me-hv','.me-tu','.me-graph','.me-bl','.me-j'].map(s=>{const e=root.querySelector(s),r=e.getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height,font:getComputedStyle(e).fontSize}]}));
    });
    assert.deepEqual(measured,metrics,'original component geometry');
    assert.equal(pixels,0,'pixel-identical renderer under the same theme and data');
    const events=[]; await page.evaluate(()=>{window.info=[];window.card.addEventListener('hass-more-info',e=>window.info.push(e.detail.entityId));});
    await page.locator('niak-weather-card .me-tu').first().click();
    assert.equal(await page.evaluate(()=>window.info[0]),'sensor.vent');
    await page.locator('niak-weather-card .me-hval').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.info[1]),'sensor.t_ext');
    const axe=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();
    assert.deepEqual(axe.violations.map(v=>v.id),[], 'automated structural accessibility');
    reports.push({width,dark,height:b.height,differentPixels:pixels,geometry:'identical',interactions:'mouse + keyboard passed',accessibility:'structural scan passed; contrast inherited from HA theme'});
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
  assert.deepEqual(errors,[],'browser console/network');
  writeFileSync(`${out}/browser-report.json`,JSON.stringify({reports,behavior,errors},null,2));
  console.log(JSON.stringify({reports,behavior,errors},null,2));
} finally { await browser.close();server.close(); }

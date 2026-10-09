// Browser checks of the real bundle, with the shared demonstration data (demo/demo-hass.js):
// layout at three widths and two themes, accessibility, gestures, the full card window, folding sections, the « i » bubbles and the editor.
//   npm run test:browser
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import * as mdi from '@mdi/js';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const out = 'test-results'; mkdirSync(out, { recursive: true });
const files = { '/': ['text/html; charset=utf-8', 'scripts/visual/harness.html'], '/card.js': ['text/javascript', 'dist/niak-weather-card.js'], '/demo-hass.js': ['text/javascript', 'demo/demo-hass.js'] };
const icons = JSON.stringify(mdi);
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname, file = files[path];
  if (path === '/icons.json') { res.setHeader('Content-Type', 'application/json'); res.end(icons); }
  else if (file) { res.setHeader('Content-Type', file[0]); res.end(readFileSync(file[1])); }
  else { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const report = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Shows a scenario of demo-hass in the bench page and waits for forecasts, history and icons. */
const show = async s => { await page.evaluate(s => window.show(s), s); await sleep(250); };
const inCard = (fn, arg) => page.evaluate(([source, arg]) => new Function('root', 'card', 'arg', `return (${source})(root, card, arg)`)(document.querySelector('niak-weather-card').shadowRoot, document.querySelector('niak-weather-card'), arg), [fn.toString(), arg]);

try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.ready);

  // 1. Layout: nothing wider than the card, at phone, tablet and desktop widths, in both themes, in every format.
  report.layout = [];
  for (const theme of ['light', 'dark']) for (const width of [375, 768, 1180]) for (const format of ['tile', 'intermediate', 'full']) {
    for (const condition of ['partlycloudy', 'pouring']) {
      await show({ format, width, theme, condition, vigilance: condition === 'pouring' ? 'Orange' : undefined, animated: false });
      const overflow = await inCard(root => {
        const host = root.host.getBoundingClientRect();
        return [...root.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && !e.closest('.sky, dialog, .hours, .days, .press-ring') && (r.right > host.right + 1 || r.left < host.left - 1); })
          .map(e => e.className || e.tagName).slice(0, 5);
      });
      assert.deepEqual(overflow, [], `Overflow ${format} ${width} ${theme} ${condition}`);
      report.layout.push(`${format} ${width} ${theme} ${condition}`);
    }
  }

  // 2. Accessibility of each format (axe: serious and critical issues).
  report.axe = {};
  for (const format of ['tile', 'full']) {
    await show({ format, width: format === 'full' ? 1180 : 680, condition: 'rainy', vigilance: 'Jaune', animated: false });
    const result = await new AxeBuilder({ page }).include('#stage').disableRules(['region']).analyze();
    const serious = result.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(', ')}`);
    assert.deepEqual(serious, [], `Accessibility ${format}`);
    report.axe[format] = result.violations.length;
  }

  // 3. The tile: a tap unfolds it and is remembered; a long press opens the full card over the page; the keyboard does both.
  await page.evaluate(() => localStorage.clear());
  await show({ format: 'tile', width: 680, condition: 'pouring', vigilance: 'Jaune', animated: false });
  // Without a weather page of its own, a long press opens the full card over the page.
  await page.evaluate(() => { const c = document.querySelector('niak-weather-card'), { weather_path, ...config } = c.config; c.setConfig(config); }); await sleep(50);
  const tile = page.locator('niak-weather-card .nw-tilecard');
  const state = () => inCard(root => ({ open: root.querySelector('.nw-tilecard').classList.contains('open'), expanded: root.querySelector('.nw-tilecard').getAttribute('aria-expanded'),
    dialog: !!root.querySelector('dialog')?.open, inert: root.querySelector('.more').inert, reveal: getComputedStyle(root.querySelector('.reveal') ?? root.host).opacity }));
  assert.deepEqual(await state(), { open: false, expanded: 'false', dialog: false, inert: true, reveal: '0' }, 'Tile starts folded, extra alert waiting in the bubble');
  const tickerFolded = await inCard(root => root.querySelector('niak-ticker').points.map(p => 'alert' in p));
  assert.equal(tickerFolded[0], true, 'Folded: the second alert leads the scrolling bubble, in alert style');
  await tile.click({ position: { x: 120, y: 30 } }); await sleep(600);
  const open = await state();
  assert.deepEqual({ ...open, reveal: undefined }, { open: true, expanded: 'true', dialog: false, inert: false, reveal: undefined }, 'Tap unfolds');
  assert.equal(await inCard(root => root.querySelector('niak-ticker').points.some(p => 'alert' in p)), false, 'Unfolded: alerts are stacked, not in the bubble');
  assert.equal(await page.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith('niak-weather:open:tile'))?.[1]), '1', 'Unfolded state remembered');
  // Hours and days.
  await page.locator('niak-weather-card .seg button', { hasText: 'Jours' }).click(); await sleep(100);
  assert.equal(await inCard(root => root.querySelectorAll('.days .nw-tile').length), 5, 'Days tab');
  assert.equal((await state()).open, true, 'The switch does not fold the tile');
  // Long press.
  const box = await tile.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 30); await page.mouse.down(); await sleep(650); await page.mouse.up(); await sleep(300);
  const dialog = await inCard(root => { const d = root.querySelector('dialog'); return { open: d?.open, sections: [...d.querySelectorAll('.fm-section h2')].map(h => h.textContent), tile: root.querySelector('.nw-tilecard').classList.contains('open') }; });
  assert.deepEqual(dialog, { open: true, sections: ['Aujourd’hui', 'Prévisions'], tile: true }, 'Long press opens the full card, the tile stays as it was');
  report.dialogScreenshot = `${out}/qa-dialog.png`; await page.screenshot({ path: report.dialogScreenshot });
  // A value opens its sensor's details, after closing the window (Home Assistant's window would be hidden under it).
  const detail = await page.evaluate(async () => {
    const card = document.querySelector('niak-weather-card'); let id;
    card.addEventListener('hass-more-info', e => { id = e.detail.entityId; }, { once: true });
    card.shadowRoot.querySelector('dialog .nw-panel [data-entity]').click(); await new Promise(r => setTimeout(r, 50));
    return { id, open: !!card.shadowRoot.querySelector('dialog')?.open };
  });
  assert.ok(detail.id?.startsWith('sensor.'), 'A value opens its sensor'); assert.equal(detail.open, false, 'The window closes first');
  // Keyboard: Enter folds, Shift+Enter opens the full card, Escape closes it.
  await tile.focus(); await page.keyboard.press('Enter'); await sleep(100);
  assert.equal((await state()).open, false, 'Enter folds');
  await page.keyboard.press('Shift+Enter'); await sleep(200);
  assert.equal((await state()).dialog, true, 'Shift+Enter opens the full card');
  await page.keyboard.press('Escape'); await sleep(200);
  assert.equal((await state()).dialog, false, 'Escape closes it');
  // With a weather page, the long press goes there.
  await page.evaluate(() => { const c = document.querySelector('niak-weather-card'); c.setConfig({ ...c.config, weather_path: '/meteo' }); });
  const went = page.evaluate(() => new Promise(r => window.addEventListener('location-changed', () => r(location.pathname), { once: true })));
  await page.mouse.move(box.x + 100, box.y + 30); await page.mouse.down(); await sleep(650); await page.mouse.up();
  assert.equal(await went, '/meteo', 'Long press opens the weather page when one is set');
  await page.evaluate(() => history.replaceState(null, '', '/'));
  report.tile = 'ok';

  // 4. The intermediate format starts unfolded.
  await page.evaluate(() => localStorage.clear());
  await show({ format: 'intermediate', width: 680, animated: false });
  assert.equal((await state()).open, true, 'Intermediate starts unfolded');

  // 5. Full card: sections fold with a tap on their title; their starting state comes from the settings.
  await show({ format: 'full', width: 1180, animated: false });
  const sections = () => inCard(root => [...root.querySelectorAll('.fm-section')].map(s => s.classList.contains('folded')));
  assert.deepEqual(await sections(), [false, false], 'Unfolded by default');
  await page.locator('niak-weather-card .fm-section .fm-head').first().click(); await sleep(50);
  assert.deepEqual(await sections(), [true, false], 'A tap on the title folds');
  await page.evaluate(() => { const c = document.querySelector('niak-weather-card'); c.setConfig({ ...c.config, collapse_predictions: true }); }); await sleep(50);
  assert.deepEqual(await sections(), [false, true], 'collapse_predictions folds Prévisions at first');
  await page.evaluate(() => { const c = document.querySelector('niak-weather-card'); c.setConfig({ ...c.config, collapse_predictions: false }); }); await sleep(50);

  // 6. The « i » bubbles open inside the screen, on a phone too.
  for (const width of [375, 1180]) {
    await page.setViewportSize({ width: Math.max(width + 40, 420), height: 900 });
    await show({ format: 'full', width, animated: false });
    for (const id of ['brief', 'feel']) {
      const button = page.locator(`niak-weather-card [popovertarget$="-${id}"]`);
      await button.scrollIntoViewIfNeeded(); await button.click(); await sleep(80);
      const pop = await inCard((root, card, id) => { const p = root.querySelector(`[id$="-${id}"]`), r = p.getBoundingClientRect();
        return { open: p.matches(':popover-open'), inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, text: p.textContent.replace(/\s+/g, ' ') }; }, id);
      assert.equal(pop.open && pop.inside, true, `« i » ${id} at ${width}`);
      if (id === 'feel') assert.match(pop.text, /En ce moment : .* = .* °C ressentis/, 'The feel bubble shows today’s calculation');
      await page.keyboard.press('Escape');
    }
  }
  await page.setViewportSize({ width: 1300, height: 1000 });

  // 7. The charter: one radius, one source pill, the meaning colours from the tokens.
  await show({ format: 'full', width: 1180, condition: 'rainy', animated: false });
  const charter = await inCard(root => {
    const style = s => getComputedStyle(s);
    const badges = [...root.querySelectorAll('.nw-badge')].map(b => [style(b).fontSize, style(b).paddingTop, style(b).borderTopLeftRadius].join(' '));
    const radii = [...root.querySelectorAll('.nw-panel, .nw-tile, .nw-bubble')].map(p => style(p).borderTopLeftRadius);
    const sizes = new Set([...root.querySelectorAll('.nw-full *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => style(e).fontSize));
    root.host.style.setProperty('--niak-rain-color', 'rgb(255, 0, 0)');
    const themed = style(root.querySelector('.fc-bar, .bars i:not(.zero)')).backgroundColor;
    root.host.style.removeProperty('--niak-rain-color');
    return { badges: [...new Set(badges)], radii: [...new Set(radii)], sizes: [...sizes].sort(), themed };
  });
  assert.equal(charter.badges.length, 1, `One source pill style: ${charter.badges}`);
  assert.deepEqual(charter.radii, ['14px'], 'One radius for every box');
  assert.ok(charter.sizes.every(s => ['10px', '12px', '13px', '17px', '30px', '42px'].includes(s)), `Six text sizes only: ${charter.sizes}`);
  assert.match(charter.themed, /255, 0, 0|oklab|color\(srgb 1 0 0/, 'A theme can recolour rain');
  report.charter = charter;

  // 8. Two cards on one page never share their chart gradients.
  const ids = await page.evaluate(async () => {
    const stage = document.getElementById('stage'), second = document.createElement('niak-weather-card'), first = document.querySelector('niak-weather-card');
    second.setConfig(first.config); second.hass = first.hass; stage.append(second); await second.updateComplete; await new Promise(r => setTimeout(r, 250));
    const all = [first, second].flatMap(c => [...c.shadowRoot.querySelectorAll('linearGradient')].map(g => g.id));
    second.remove(); return all;
  });
  assert.equal(new Set(ids).size, ids.length, 'Unique gradient names');

  // 9. The editor shows the settings of the chosen format.
  const editor = await page.evaluate(async () => {
    if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
    const names = schema => schema.flatMap(f => f.schema ? names(f.schema) : [f.name]);
    const run = async format => {
      const e = document.createElement('niak-weather-card-editor'); document.body.append(e);
      e.hass = document.querySelector('niak-weather-card').hass; e.setConfig({ type: 'custom:niak-weather-card', weather_entity: 'weather.demo', format });
      await e.updateComplete; await new Promise(r => setTimeout(r, 50));
      const forms = [...e.shadowRoot.querySelectorAll('ha-form')].flatMap(f => names(f.schema ?? []));
      e.remove(); return forms;
    };
    return { full: await run('full'), tile: await run('tile') };
  });
  for (const name of ['collapse_today', 'collapse_predictions']) assert.ok(editor.full.includes(name), `Full card setting ${name}`);
  assert.ok(editor.tile.includes('weather_path') && !editor.tile.includes('collapse_today'), 'Tile settings');
  report.editor = editor;

  assert.deepEqual(errors, [], 'Browser errors');
  writeFileSync(`${out}/browser-report.json`, JSON.stringify(report, null, 2));
  console.log(`Contrôles navigateur réussis : ${report.layout.length} mises en page, accessibilité, gestes, fenêtre complète, sections repliables, bulles « i », charte, éditeur.`);
} finally { await browser.close(); server.close(); }

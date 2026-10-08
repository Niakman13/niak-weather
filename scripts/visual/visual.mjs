// Banc visuel de Niak Weather.
//   node scripts/visual/visual.mjs capture [--card dist/niak-weather-card.js] [--out actuel] [--only ciel,alertes]
//   node scripts/visual/visual.mjs compare reference actuel     → images de différences + rapport
//   node scripts/visual/visual.mjs sheet actuel                 → une planche PNG par groupe
// Heure figée (8 octobre 2026, 17 h 40 à Paris) et animations coupées : une même scène donne toujours la même image.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mdi from '@mdi/js';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { SCENES, GROUPS } from './scenarios.mjs';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../..');
const RESULTS = join(root, 'test-results/visual');
const FIXED_TIME = new Date('2026-10-08T17:40:00+02:00');
const args = process.argv.slice(2), command = args[0];
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i > 0 ? args[i + 1] : fallback; };

/** Sert la page du banc, la carte à tester et les icônes MDI sur un port libre. */
function serve(cardPath) {
  const icons = JSON.stringify(mdi), harness = readFileSync(join(here, 'harness.html')), demoHass = readFileSync(join(root, 'demo/demo-hass.js'));
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    const send = (type, body) => { res.setHeader('Content-Type', type); res.end(body); };
    if (path === '/') send('text/html; charset=utf-8', harness);
    else if (path === '/card.js') send('text/javascript', readFileSync(cardPath));
    else if (path === '/icons.json') send('application/json', icons);
    else if (path === '/demo-hass.js') send('text/javascript', demoHass);
    else { res.writeHead(404); res.end(); }
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function capture() {
  const card = resolve(root, option('card', 'dist/niak-weather-card.js')), out = join(RESULTS, option('out', 'actuel'));
  const only = option('only')?.split(','), scenes = SCENES.filter(s => !only || only.includes(s.group));
  if (!existsSync(card)) throw new Error(`Carte introuvable : ${card} (lancer npm run build)`);
  const server = await serve(card), browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await page.clock.install({ time: FIXED_TIME });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.ready);
  for (const scene of scenes) {
    await page.evaluate(s => window.show(s), scene);
    await page.waitForTimeout(250); // prévisions simulées et icônes
    await page.evaluate(() => document.fonts.ready);
    const file = join(out, `${scene.id}.png`); mkdirSync(dirname(file), { recursive: true });
    await page.locator('#stage').screenshot({ path: file, animations: 'disabled', caret: 'hide' });
  }
  await browser.close(); server.close();
  console.log(`${scenes.length} scènes capturées dans ${out}`);
}

function compare() {
  const [a, b] = [args[1] ?? 'reference', args[2] ?? 'actuel'].map(d => join(RESULTS, d));
  const report = { identiques: 0, differentes: [], manquantes: [] };
  for (const scene of SCENES) {
    const fa = join(a, `${scene.id}.png`), fb = join(b, `${scene.id}.png`);
    if (!existsSync(fa) || !existsSync(fb)) { report.manquantes.push(scene.id); continue; }
    const ia = PNG.sync.read(readFileSync(fa)), ib = PNG.sync.read(readFileSync(fb));
    if (ia.width !== ib.width || ia.height !== ib.height) { report.differentes.push({ id: scene.id, taille: `${ia.width}×${ia.height} → ${ib.width}×${ib.height}` }); continue; }
    const diff = new PNG({ width: ia.width, height: ia.height });
    const pixels = pixelmatch(ia.data, ib.data, diff.data, ia.width, ia.height, { threshold: 0.1 });
    if (!pixels) { report.identiques++; continue; }
    report.differentes.push({ id: scene.id, pixels });
    const file = join(RESULTS, 'differences', `${scene.id}.png`); mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, PNG.sync.write(diff));
  }
  writeFileSync(join(RESULTS, 'rapport.json'), JSON.stringify(report, null, 2));
  console.log(`${report.identiques} identiques, ${report.differentes.length} différentes, ${report.manquantes.length} manquantes`);
  for (const d of report.differentes) console.log(`  ≠ ${d.id} : ${d.pixels ? `${d.pixels} pixels` : d.taille}`);
  if (report.differentes.length || report.manquantes.length) process.exitCode = 1;
}

/** Une planche par groupe : les images en grille, chacune avec son libellé. */
async function sheet() {
  const dir = join(RESULTS, args[1] ?? 'actuel'), browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  for (const [group, title] of Object.entries(GROUPS)) {
    const scenes = SCENES.filter(s => s.group === group && existsSync(join(dir, `${s.id}.png`)));
    if (!scenes.length) continue;
    const cols = group === 'ciel' ? 3 : 2;
    const cells = scenes.map(s => `<figure${s.width > 700 ? ' class="wide"' : ''}><img src="data:image/png;base64,${readFileSync(join(dir, `${s.id}.png`)).toString('base64')}"><figcaption>${s.label}</figcaption></figure>`).join('');
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:28px;background:#e9edf2;font:15px/1.4 system-ui,sans-serif;color:#253047}
      h1{font-size:26px;margin:0 0 4px} p{margin:0 0 22px;color:#606b7c}
      main{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:18px 16px;align-items:start}
      figure{margin:0} figure.wide{grid-column:1/-1} img{display:block;max-width:100%;height:auto;border-radius:10px} figcaption{margin-top:6px;font-weight:600;font-size:13px}
    </style><h1>Niak Weather · ${title}</h1><p>Version actuelle, données de démonstration, jeudi 8 octobre 17 h 40, animations figées.</p><main>${cells}</main>`);
    const file = join(RESULTS, 'planches', `${group}.png`); mkdirSync(dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
    console.log(`Planche ${title} : ${file}`);
  }
  await browser.close();
}

const commands = { capture, compare, sheet };
if (!commands[command]) { console.error('Commande : capture | compare | sheet'); process.exit(2); }
await commands[command]();

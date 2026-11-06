// Plays Chapter I in a phone-sized browser through the real buttons, fast-forwarded, and saves screenshots
// of the key moments. Needs Playwright.
// Usage: node tests/play.js [path/to/index.html] [screenshot folder]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const out = path.resolve(process.argv[3] || path.join(__dirname, 'shots'));
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shots = [];
  const snap = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, name + '.png') }); shots.push(name); };
  const st = () => page.evaluate(() => { const s = window.__emp.state(); return { phase: s.phase, port: s.port, home: s.home, pending: s.pending, stop: s.camp && s.camp.stop, silver: s.silver, day: s.dayN, dock: window.__emp.fns.dockItems(s).length }; });
  const open = async sel => { await page.click(sel); await page.waitForSelector('#sheet:not([hidden])'); };
  const close = async () => { await page.click('#sheetCard button[data-act="close"]'); await page.waitForSelector('#sheet', { state: 'hidden' }); };
  const buyN = async (m, g, n) => { await open(`.person[data-m="${m}"]`); for (let i = 0; i < n; i++) await page.click(`#sheetCard button[data-act="buy"][data-g="${g}"]`); await close(); };
  const tab = async t => { await page.click(`#tab-${t}`); await page.waitForTimeout(150); };

  await page.goto(file);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(600);
  await snap('01-title');
  await page.click('button[data-t="begin"]');
  for (let i = 0; i < 7; i++) { if (i === 3) await snap('02-intro'); await page.click('button[data-t="next"]'); }
  await page.click('button[data-t="harbour"]');
  await page.waitForTimeout(700);
  await snap('03-rhodes-quay');

  // Rhodes: provisions, the bolt-thrower, a slinger, and a mixed cargo
  await buyN('stores', 'water', 2); await buyN('stores', 'barley', 1);
  await buyN('arsenal', 'bolt', 1);
  await open('.person[data-m="thras"]'); await page.click('#sheetCard button[data-act="haggle"]'); await snap('04-merchant');
  for (let i = 0; i < 4; i++) await page.click('#sheetCard button[data-act="buy"][data-g="wine"]');
  await close();
  await buyN('korinna', 'sponge', 3); await buyN('korinna', 'figs', 3); await buyN('aristeia', 'cups', 3);
  await open('.person[data-hire="philon"]'); await page.click('#sheetCard button[data-act="hire"]'); await close();
  await tab('hold');
  await snap('05-hold-quay');
  await page.click('button[data-act="autopack"]');
  await snap('06-hold-packed');
  await tab('main');
  await open('button[data-act="sail"]');
  await snap('07-sail-check');
  await page.click('#sheetCard button[data-act="sail-yes"]');
  await page.evaluate(() => window.__emp.speed(12));

  const seen = new Set();
  async function voyage(label) {
    for (let guard = 0; guard < 3000; guard++) {
      const s = await st();
      if (s.phase === 'port') return s;
      const sheet = await page.evaluate(() => { const ui = window.__emp.ui; return ui.sheet && ui.sheet.kind === 'event' ? (ui.outcome ? 'outcome' : window.__emp.state().pending) : null; });
      if (sheet === 'outcome') { if (!seen.has(label + 'out')) { seen.add(label + 'out'); await snap(label + '-outcome'); } await page.click('#sheetCard button[data-act="continue"]'); continue; }
      if (sheet) {
        const risk = await page.evaluate(() => window.__emp.fns.atRisk(window.__emp.state()).length);
        const pick = sheet === 'squall' ? (risk ? 'shelter' : 'ride') : 'fight';
        await snap(label + '-event-' + sheet);
        await page.click(`#sheetCard button[data-c="${pick}"]`);
        continue;
      }
      if (s.phase === 'camp') {
        if (!seen.has(label + s.stop)) { seen.add(label + s.stop); await page.waitForTimeout(400); await snap(label + '-camp-' + s.stop); }
        for (const id of ['spring', 'fish', 'sponge']) { const b = await page.$(`#panel button[data-act="camp"][data-id="${id}"]:not([disabled])`); if (b) await b.click(); }
        if (s.dock) { await tab('hold'); await page.click('button[data-act="autopack"]'); await tab('main'); }
        const route = await page.$('#panel button[data-act="sleep"][data-route="coast"]');
        if (route) { await snap(label + '-route'); await route.click(); } else await page.click('#panel button[data-act="sleep"]');
        await page.waitForTimeout(150);
        continue;
      }
      if (s.phase === 'sea') {
        const late = await page.evaluate(() => { const S = window.__emp.state(); return window.__emp.fns.eta(S, false) > 0.97; });
        const rowing = await page.evaluate(() => window.__emp.state().voyage.row);
        if (late !== rowing) { const b = await page.$(`#panel button[data-act="row"][data-v="${late ? 1 : 0}"]`); if (b) await b.click(); }
        if (!seen.has(label + 'sea' + s.day)) {
          const clock = await page.evaluate(() => window.__emp.state().voyage.clock);
          if (clock > 0.3) { seen.add(label + 'sea' + s.day); await snap(label + '-sea-day' + s.day); }
        }
      }
      await page.waitForTimeout(80);
    }
    throw new Error('voyage did not finish: ' + JSON.stringify(await st()));
  }
  let s = await voyage('out');
  if (s.port !== 'halic') throw new Error('expected Halicarnassus, got ' + JSON.stringify(s));
  await page.waitForTimeout(600);
  await snap('20-halic-quay');

  // Halicarnassus: sell everything to whoever buys it, then load for home
  for (const m of ['dion', 'mania', 'theodote', 'hermon']) {
    await open(`.person[data-m="${m}"]`);
    const h = await page.$('#sheetCard button[data-act="haggle"]:not([disabled])'); if (h) await h.click();
    for (let k = 0; k < 20; k++) { const b = await page.$('#sheetCard .trade button[data-act="sell"]:not([disabled])'); if (!b) break; await b.click(); }
    await close();
  }
  await open('.person[data-hire="lykos"]'); await page.click('#sheetCard button[data-act="hire"]'); await close();
  await open('.person[data-hire="kydas"]'); await page.click('#sheetCard button[data-act="hire"]'); await close();
  await buyN('uliades', 'marble', 2); await buyN('hermon', 'scent', 3); await buyN('theodote', 'cloth', 1); await buyN('mania', 'honey', 2);
  await open('.person[data-m="hstores"]'); const fill = await page.$('#sheetCard button[data-act="refill"]:not([disabled])'); if (fill) await fill.click(); await page.click('#sheetCard button[data-act="buy"][data-g="barley"]'); await close();
  await tab('hold'); await page.click('button[data-act="autopack"]'); await snap('21-hold-home');
  await tab('main');
  await open('button[data-act="sail"]'); await page.click('#sheetCard button[data-act="sail-yes"]');
  s = await voyage('home');
  if (s.port !== 'rhodes' || !s.home) throw new Error('expected to be home, got ' + JSON.stringify(s));
  await page.waitForTimeout(600);
  await snap('30-home-quay');
  for (const m of ['works', 'korinna', 'thras']) {
    await open(`.person[data-m="${m}"]`);
    for (;;) { const b = await page.$('#sheetCard .trade button[data-act="sell"]:not([disabled])'); if (!b) break; await b.click(); }
    await close();
  }
  await open('.person[data-m="bank"]'); await snap('31-bank');
  await page.click('#sheetCard button[data-act="repay"]');
  await page.waitForSelector('#theater:not([hidden]) button[data-t="again"]');
  await page.waitForTimeout(500);
  await snap('32-summary');
  const sum = await page.evaluate(() => window.__emp.state().summary);
  console.log('summary:', JSON.stringify(sum));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  console.log('screenshots:', shots.join(', '));
  await browser.close();
  if (errors.length) process.exit(1);
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });

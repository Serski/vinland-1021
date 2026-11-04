// Plays all four chapters and the epilogue in a phone-sized browser through the real buttons,
// fast-forwarded, and saves screenshots of the key moments.
// Usage: node tests/play.js [path/to/index.html] [screenshot folder]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const out = path.resolve(process.argv[3] || path.join(__dirname, 'shots'));
fs.mkdirSync(out, { recursive: true });
const CHOICE = { 2: { meet: 'peace' }, 3: { visit1: 'refuse', thief: 'stop' }, 4: { houses: 'evict', ships: 'leave' } };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shots = new Set();
  const snap = async name => { if (shots.has(name)) return; shots.add(name); await page.screenshot({ path: path.join(out, name + '.png') }); };
  const visible = sel => page.evaluate(q => { const el = document.querySelector(q); return !!el && !el.closest('[hidden]') && el.offsetParent !== null; }, sel);
  await page.goto(file);
  await page.waitForTimeout(600);
  await page.click('button[data-t="begin"]');
  const startBot = () => page.evaluate(() => {
    const v = window.__vin; v.speed(40);
    clearInterval(window.__bot);
    window.__bot = setInterval(() => {
      const s = v.state(); if (s.phase !== 'camp' || s.pending) return;
      const a = (t, id) => v.act(t, id), r = v.rates(), winter = v.season() === 'winter';
      for (let k = 0; k < 3; k++) {
        if (r.foodNet < 0.4 && s.jobs.fish < Math.ceil(s.crew / 6) && !winter) a('hire', 'fish');
        if (s.jobs.wood < 5) a('hire', 'wood');
        if (s.cattle > 0 && s.jobs.herd < Math.ceil(s.cattle / 4)) a('hire', 'herd');
        a('upgrade', 'handles'); if (s.halls === 0) a('hall'); a('explore');
        if (s.found.iron) a('build', 'smithy'); if (s.halls >= 1) a('build', 'shed');
        if (s.built.smithy && s.jobs.smith < (s.ch === 1 ? 3 : 1)) a('hire', 'smith');
        a('upgrade', 'axes'); a('upgrade', 'weir');
        if (s.cattle > 0) a('build', 'byre');
        if (s.ch === 3 || s.people.trust <= -30) a('build', 'palisade');
        if (s.t - s.t0 > 150 || s.ch > 1) a('hall');
        if (s.found.grapes && s.jobs.grape < 5 && !winter) a('hire', 'grape');
        a('upgrade', 'racks'); a('upgrade', 'walls'); a('upgrade', 'baskets');
        for (const id of ['planks', 'rivets', 'tar', 'mast', 'keel']) a('ship', id);
        if (s.visit && s.dairy >= 20) a('trade');
        if (s.ch === 4) { if (s.feud > 35) a('feast'); if (s.feud > 45) a('help'); }
        a('upgrade', 'towboat'); a('upgrade', 'deck'); a('hire', 'wood');
      }
    }, 50);
  });
  await startBot();
  for (let ch = 1; ch <= 4; ch++) {
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      const st = await page.evaluate(() => { const v = window.__vin, s = v.state(), cg = v.cargo(); return { ch: s.ch, pending: s.pending, block: v.sailBlock(), full: cg.used >= cg.room - 5, season: v.season(), left: v.left(), t: s.t - s.t0, visit: !!s.visit, cattle: s.cattle, feud: s.feud }; });
      if (await visible('#sheet[data-mode="event"] button[data-ev]')) {
        const id = await page.evaluate(() => document.querySelector('#sheetCard button[data-ev]').dataset.ev);
        if (id === 'done') { await snap(`ch${ch}-outcome-${st.ch}`); await page.click('#sheetCard button[data-ev="done"]'); continue; }
        const ev = await page.evaluate(() => window.__vin.state().pending);
        await snap(`ch${ch}-event-${ev}`);
        const pick = (CHOICE[ch] || {})[ev] || await page.evaluate(() => document.querySelector('#sheetCard button[data-ev]').dataset.ev);
        await page.click(`#sheetCard button[data-ev="${pick}"]`);
        await page.waitForTimeout(150);
        continue;
      }
      if (ch === 3 && st.visit && st.t > 200) { await page.click('#tab-people'); await page.waitForTimeout(250); await snap('ch3-trade'); }
      if (ch === 3 && st.season === 'summer' && st.t > 230) { await page.click('#tab-work'); await page.waitForTimeout(200); await snap('ch3-camp'); }
      if (ch === 4 && st.t > 240) { await page.click('#tab-people'); await page.waitForTimeout(250); await snap('ch4-feud'); }
      if (!st.block && (st.full || (st.season === 'summer' && st.left < 40) || (st.season === 'spring' && st.left < 30))) break;
      await page.waitForTimeout(200);
    }
    const before = await page.evaluate(() => ({ block: window.__vin.sailBlock(), t: Math.round((window.__vin.state().t - window.__vin.state().t0) / 6) / 10 }));
    console.log(`chapter ${ch}: ready to sail after ${before.t} game-min, block='${before.block}'`);
    await page.evaluate(() => { clearInterval(window.__bot); window.__vin.speed(1); });
    await page.click('#tab-ship'); await page.waitForTimeout(200);
    await page.click('button[data-act="sail"]'); await page.waitForTimeout(150);
    await page.click('button[data-act="sail-yes"]');
    if (ch === 1) { await page.waitForSelector('#tActions button.primary', { timeout: 40000 }); await page.click('#tActions button.primary'); }
    await page.waitForSelector(ch < 4 ? 'button[data-t="next"]' : 'button[data-t="epilogue"]', { timeout: 60000 });
    await page.waitForTimeout(400);
    await snap(`ch${ch}-summary`);
    const sum = await page.evaluate(() => ({ head: document.querySelector('.stone h2').textContent, total: document.querySelector('.tally .total dd').textContent, saga: window.__vin.state().renownTotal }));
    console.log(`  summary: "${sum.head}", chapter renown ${sum.total}, saga total ${sum.saga}`);
    if (ch < 4) {
      await page.click('button[data-t="next"]');
      await page.waitForTimeout(500);
      await snap(`ch${ch + 1}-card`);
      await page.click('button[data-t="begin"]');
      await page.waitForTimeout(300);
      await snap(`ch${ch + 1}-start`);
      await startBot();
    }
  }
  await page.click('button[data-t="epilogue"]');
  for (let i = 0; i < 260; i++) {
    const end = await page.evaluate(() => !!document.querySelector('button[data-t="again"]') && !document.querySelector('#tCard').hidden && window.__vin.state().phase === 'done');
    if (end) break;
    await page.mouse.click(195, 300);
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(800);
  await snap('end');
  console.log('final phase:', await page.evaluate(() => window.__vin.state().phase), 'history:', JSON.stringify(await page.evaluate(() => window.__vin.state().history)));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  console.log('screenshots:', [...shots].join(', '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });

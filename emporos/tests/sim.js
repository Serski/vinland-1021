// Balance check: plays Chapter I with simple bots that follow different strategies, over many seeds,
// and reports what each one earns. Reads the rules straight out of the game file. No dependencies.
// Usage: node tests/sim.js [path/to/game.html] [games per strategy]
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'src', 'game.html');
const GAMES = +process.argv[3] || 200;
const html = fs.readFileSync(file, 'utf8');
const code = html.split('// ===== ENGINE START =====')[1].split('// ===== ENGINE END =====')[0];
const E = new Function(code + `
return { newGame, begin, buy, sell, haggle, hire, autoPack, setSail, tick, setRow, campAct, sleep, needsRoute, resolveEvent,
  repay, eta, provisions, mouths, holdUsed, holdCells, sellPrice, buyPrice, merchantsAt, MERCHANTS, GOODS, OUT, dockItems,
  atRisk, stockLeft, cargoValue, sailCheck, isCargo };`)();

// Each strategy: what to carry out and home, who to hire, and what to do when things go wrong.
const STRATEGIES = {
  careful: { bolt: true, hires: ['philon', 'lykos', 'kydas'], out: ['sponge', 'sponge', 'sponge', 'cups', 'cups', 'cups', 'wine', 'wine', 'wine', 'wine', 'figs', 'figs', 'figs', 'figs'],
    home: ['marble', 'marble', 'scent', 'scent', 'scent', 'cloth', 'honey', 'honey', 'honey', 'honey'], pirates: 'fight', squall: 'auto', route: 'coast', water: 3, barley: 2 },
  fighters: { bolt: false, hires: ['philon', 'kydas'], out: ['wine', 'wine', 'wine', 'wine', 'wine', 'figs', 'figs', 'figs', 'figs', 'sponge', 'sponge'],
    home: ['marble', 'honey', 'honey', 'honey', 'honey', 'cloth', 'cloth', 'honey'], pirates: 'fight', squall: 'ride', route: 'coast', water: 3, barley: 2 },
  greedy: { bolt: false, hires: [], out: ['wine', 'wine', 'wine', 'wine', 'wine', 'wine', 'wine', 'wine', 'cups', 'cups', 'cups', 'cups', 'figs', 'figs', 'figs', 'figs', 'figs'],
    home: ['marble', 'marble', 'scent', 'scent', 'scent', 'scent', 'honey', 'honey', 'honey', 'honey', 'honey', 'honey', 'hermes'], pirates: 'pay', squall: 'ride', route: 'open', water: 2, barley: 1 },
  brave: { bolt: true, hires: [], out: ['wine', 'wine', 'wine', 'wine', 'wine', 'wine', 'figs', 'figs', 'figs', 'figs', 'sponge', 'sponge', 'cups', 'cups'],
    home: ['marble', 'marble', 'honey', 'honey', 'honey', 'honey', 'honey', 'cloth', 'scent', 'scent'], pirates: 'fight', squall: 'auto', route: 'coast', water: 2, barley: 1 },
  runner: { bolt: false, hires: [], out: ['wine', 'wine', 'wine', 'figs', 'figs', 'figs'], home: ['honey', 'honey', 'honey', 'scent', 'scent', 'cloth'],
    pirates: 'run', squall: 'shelter', route: 'coast', water: 2, barley: 1 },
  hungry: { bolt: false, hires: ['philon'], out: ['wine', 'wine', 'wine', 'wine', 'wine', 'wine', 'wine', 'wine', 'figs', 'figs', 'figs', 'figs', 'figs', 'figs'],
    home: ['honey', 'honey', 'honey', 'honey', 'honey', 'honey', 'honey', 'honey', 'marble'], pirates: 'pay', squall: 'ride', route: 'open', water: 0, barley: 0 },
};

function seller(s, g, dir) {   // the merchant here with the best price for g
  let best = null, bp = dir === 'buy' ? Infinity : 0;
  for (const id of E.merchantsAt(s.port)) {
    const p = dir === 'buy' ? E.buyPrice(s, id, g) : E.sellPrice(s, id, g);
    if (!p || (dir === 'buy' && E.stockLeft(s, id, g) <= 0)) continue;
    if (dir === 'buy' ? p < bp : p > bp) { bp = p; best = id; }
  }
  return best;
}
function buyList(s, list) {
  for (const g of list) {
    const m = seller(s, g, 'buy');
    if (!m) continue;
    if (!E.buy(s, m, g).ok) continue;
    E.autoPack(s);
    if (E.dockItems(s).length) { const it = E.dockItems(s)[0]; E.sell(s, m, it.g); }   // it did not fit: hand it back
  }
}
function sellAll(s) {
  const tried = new Set();
  for (let guard = 0; guard < 80; guard++) {
    const it = s.items.find(i => E.isCargo(i) && !tried.has(i.g) && seller(s, i.g, 'sell') && E.MERCHANTS[seller(s, i.g, 'sell')].buys[i.g]);
    if (!it) break;
    const m = seller(s, it.g, 'sell');
    if (!s.visit.tries[m]) E.haggle(s, m);
    if (!E.sell(s, m, it.g).ok) tried.add(it.g);
  }
}
function provision(s, st) {
  for (let k = 0; k < st.water; k++) E.buy(s, s.port === 'rhodes' ? 'stores' : 'hstores', 'water');
  for (let k = 0; k < st.barley; k++) E.buy(s, s.port === 'rhodes' ? 'stores' : 'hstores', 'barley');
  for (const it of s.items) if (E.GOODS[it.g].water) it.fill = 10;   // the fountain is free
  E.autoPack(s);
}
function voyage(s, st, notes) {
  for (let guard = 0; guard < 20000 && (s.phase === 'sea' || s.phase === 'camp'); guard++) {
    if (s.pending) {
      const id = s.pending;
      let c = id === 'squall' ? (st.squall === 'auto' ? (E.atRisk(s).length ? 'shelter' : 'ride') : st.squall) : st.pirates;
      if (id === 'caught') c = st.pirates === 'run' ? 'pay' : st.pirates;
      E.resolveEvent(s, c);
      notes.push(id + ':' + c);
      continue;
    }
    if (s.phase === 'camp') {
      const stop = s.camp.stop;
      if (stop === 'symi') { E.campAct(s, 'sponge'); E.campAct(s, 'sponge'); E.campAct(s, 'spring'); E.autoPack(s); }
      if (stop === 'triopion') E.campAct(s, 'fish');
      if (stop === 'loryma') E.campAct(s, 'spring');
      E.sleep(s, E.needsRoute(s) ? st.route : undefined);
      continue;
    }
    E.setRow(s, E.eta(s, false) > 0.97);
    E.tick(s, 0.5);
  }
}
function play(name, seed) {
  const st = STRATEGIES[name], s = E.newGame(seed), notes = [];
  E.begin(s);
  for (const id of ['thras', 'korinna', 'aristeia']) E.haggle(s, id);
  if (st.bolt) { E.buy(s, 'arsenal', 'bolt'); E.autoPack(s); }
  for (const h of st.hires) if (h === 'philon') { E.hire(s, h); E.autoPack(s); }
  provision(s, st);
  buyList(s, st.out);
  const outCargo = s.items.filter(E.isCargo).length;
  E.setSail(s);
  voyage(s, st, notes);
  if (s.port !== 'halic') throw new Error(name + ' did not reach Halicarnassus: ' + s.phase);
  sellAll(s);
  for (const h of st.hires) if (h !== 'philon') { E.hire(s, h); E.autoPack(s); }
  provision(s, st);
  for (const id of ['mania', 'theodote', 'hermon']) if (!s.visit.tries[id]) E.haggle(s, id);
  buyList(s, st.home);
  const homeCargo = s.items.filter(E.isCargo).length;
  E.setSail(s);
  voyage(s, st, notes);
  if (s.port !== 'rhodes' || !s.home) throw new Error(name + ' did not get home: ' + s.phase);
  sellAll(s);
  E.repay(s);
  E.OUT.length = 0;
  if (!Number.isFinite(s.silver) || s.silver < 0) throw new Error('bad silver ' + s.silver);
  return { sum: s.summary, outCargo, homeCargo, notes, hungry: s.stats.hungry, thirsty: s.stats.thirsty, nights: s.stats.nights };
}

const pct = (n, d) => Math.round(100 * n / d) + '%';
let failed = false;
for (const name of Object.keys(STRATEGIES)) {
  const rs = [];
  for (let k = 0; k < GAMES; k++) rs.push(play(name, 1000 + k * 7919));
  const profits = rs.map(r => r.sum.profit).sort((a, b) => a - b);
  const mean = Math.round(profits.reduce((a, b) => a + b, 0) / rs.length);
  const pir = {};
  for (const r of rs) pir[r.sum.pirates] = (pir[r.sum.pirates] || 0) + 1;
  const lost = rs.reduce((a, r) => a + r.sum.lost.length, 0), broken = rs.reduce((a, r) => a + r.sum.broken, 0);
  const debt = rs.filter(r => r.sum.debt > 0).length;
  console.log(`${name.padEnd(9)} profit mean ${String(mean).padStart(4)}  min ${String(profits[0]).padStart(4)}  median ${String(profits[rs.length >> 1]).padStart(4)}  max ${String(profits[rs.length - 1]).padStart(4)}` +
    `  | cargo out/home ${rs[0].outCargo}/${rs[0].homeCargo}  days ${rs[0].sum.days}  nights at sea ${(rs.reduce((a, r) => a + r.nights, 0) / rs.length).toFixed(2)}` +
    `  hungry ${(rs.reduce((a, r) => a + r.hungry, 0) / rs.length).toFixed(2)}d thirsty ${(rs.reduce((a, r) => a + r.thirsty, 0) / rs.length).toFixed(2)}d`);
  console.log(`          pirates ${Object.keys(pir).map(k => k + ' ' + pct(pir[k], rs.length)).join(', ')}  | crew lost ${(lost / rs.length).toFixed(2)}/game  broken ${(broken / rs.length).toFixed(2)}/game  in debt ${pct(debt, rs.length)}`);
  console.log(`          ratings ${[...new Set(rs.map(r => r.sum.rating))].map(t => t + ' ' + pct(rs.filter(r => r.sum.rating === t).length, rs.length)).join(', ')}`);
  if (name === 'careful' && mean <= 40) { console.log('FAIL: careful play should clear a decent profit'); failed = true; }
}
if (failed) process.exit(1);

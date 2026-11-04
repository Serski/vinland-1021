// Pacing check: plays all four chapters back to back with a simple bot, once choosing peace and once
// following the saga, at three check-in speeds. Reads the rules straight out of the game file.
// Usage: node tests/sim.js [path/to/game.html]
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'src', 'game.html');
const html = fs.readFileSync(file, 'utf8');
const code = html.split('// ===== ENGINE START =====')[1].split('// ===== ENGINE END =====')[0];
const E = new Function(code + '\nreturn { chapterState, tick, act, calOf, rates, cargo, sailBlock, sail, decideRescue, finishChapter, renown, resolveEvent, shelterOf, idleOf, tripList, shipTasks, OUT, HALL_COSTS, hallCap };')();
const PICK = { peace: { meet: 'peace', visit1: 'refuse', thief: 'let', houses: 'share', ships: 'leave' },
               saga: { meet: 'attack', visit1: 'refuse', thief: 'stop', houses: 'evict', ships: 'ask' } };
function playChapter(s, policy, every) {
  let acc = 0;
  const t0 = s.t, notes = [];
  while (s.t - t0 < 2400) {
    if (s.pending) { const id = s.pending; E.resolveEvent(s, PICK[policy][id]); notes.push(`${id}@${Math.round(s.t - t0)}`); continue; }
    E.tick(s, 0.1); acc += 0.1;
    if (acc < every) continue;
    acc = 0;
    const c = E.calOf(s), r = E.rates(s), a = (t, id) => E.act(s, t, id);
    for (let k = 0; k < 4; k++) {
      const fishCap = Math.ceil(s.crew / 6);
      if (r.foodNet < 0.4 && s.jobs.fish < fishCap && !c.season.winter) a('hire', 'fish');
      if (s.jobs.wood < 5) a('hire', 'wood');
      if (s.cattle > 0 && s.jobs.herd < Math.ceil(s.cattle / 4)) a('hire', 'herd');
      a('upgrade', 'handles');
      if (s.halls === 0 && s.jobs.wood >= 4) a('hall');
      a('explore');
      if (s.found.iron) a('build', 'smithy');
      if (s.halls >= 1) a('build', 'shed');
      if (s.built.smithy && s.jobs.smith < (s.ch === 1 ? 3 : 1)) a('hire', 'smith');
      a('upgrade', 'axes'); a('upgrade', 'weir');
      if (s.cattle > 0) a('build', 'byre');
      if (s.ch === 3 || s.people.trust <= -30) a('build', 'palisade');
      if ((s.t - s.t0 > 150 || s.ch > 1) && E.shelterOf(s) < s.crew) a('hall');
      if (s.found.grapes && s.jobs.grape < 5 && !c.season.winter) a('hire', 'grape');
      a('upgrade', 'racks'); a('upgrade', 'walls'); a('upgrade', 'baskets');
      for (const x of E.shipTasks(s)) a('ship', x.id);
      if (s.visit && s.dairy >= 20) a('trade');
      if (s.ch === 4 && policy === 'peace') { if (s.feud > 35) a('feast'); if (s.feud > 45) a('help'); }
      a('upgrade', 'towboat'); a('upgrade', 'deck');
      a('hire', 'wood');
    }
    if (!E.sailBlock(s)) {
      const cg = E.cargo(s);
      if (cg.used >= cg.room - 5 || (c.season.id === 'summer' && c.left < 20) || (c.season.id === 'spring' && c.left < 10 && cg.used > cg.room * 0.6)) break;
    }
  }
  const minutes = ((s.t - t0) / 60).toFixed(1), c = E.calOf(s);
  const ok = E.sail(s);
  if (s.ch === 1) E.decideRescue(s, true);
  E.finishChapter(s);
  const v = s.voyage;
  return { line: `ch${s.ch} ${minutes} min (${c.season.name} Y${c.year}) sailed=${ok} renown=${E.renown(s)} cargo=${v ? v.cargo.value : 0} bonuses=[${s.bonuses.map(b => b.label + ' ' + b.value).join('; ')}] raids=${s.stats.raids} hungry=${Math.round(s.stats.hungry)}s trust=${Math.round(s.people.trust)} feud=${Math.round(s.feud)} cattle=${s.cattle} furs=${Math.floor(s.furs)} events=${notes.join(',')}`, ok };
}
for (const policy of ['peace', 'saga']) {
  for (const every of [1, 6, 20]) {
    let s = E.chapterState(1, null), total = 0;
    console.log(`\n== ${policy}, checks in every ${every}s ==`);
    for (let ch = 1; ch <= 4; ch++) {
      if (ch > 1) s = E.chapterState(ch, s);
      const res = playChapter(s, policy, every);
      console.log('  ' + res.line);
      if (!res.ok) { console.log('  STUCK: ' + E.sailBlock(s)); break; }
    }
    console.log(`  total renown ${s.renownTotal}`);
  }
}

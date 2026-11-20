// Model study (synthetic data): what the rider-surge trigger and the rupee floor actually do, and how often the
// driver would reach the alternate point before the rider can walk there.
//   node eval/pickup_threshold_study.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'app-uber-ui.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let code = scripts[scripts.length - 1][1];
code = code.slice(0, code.indexOf("document.addEventListener('click'"));
const body = `
const R = { thr: {}, floor: {}, late: {}, tierN: {} };
const THRS = [1.05, 1.1, 1.2, 1.3, 1.4, 1.5];
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
const fires = [];   // one row per (scenario) where rules fire with NO rupee floor
let surgingScen = 0;
MIN_SAVING_BY_TIER = [0, 0, 0, 0, 0];  // study the floors separately: no floor applied here
for (let ri = 1; ri < 5; ri++) for (const dow of [1, 5]) for (let m = 0; m < 1440; m += 15) for (const rain of [0, 1]) for (const event of [0, 1]) {
  state.routeIdx = ri; state.dow = dow; state.minutes = m; state.rain = rain; state.event = event; state.pickupId = null;
  const f = F(); if (f.status !== 'ok') continue;
  if (parseFloat(route().distance) <= MIN_TRIP_KM) continue;
  for (let ti = 0; ti < TIERS.length; ti++) {
    state.chosenTier = ti;
    const rec = pickupRecs(); if (rec.silent) continue;
    const hereS = rec.hereSurge;
    if (hereS > 1.05) surgingScen++;
    if (!rec.case1) continue;
    const c = rec.case1;
    fires.push({ tier: TIERS[ti].name, hereS, saving: c.saving, pct: 100 * c.saving / rec.hereFare, walk: c.walkMin, eta: TIERS[ti].eta, hereFare: rec.hereFare });
  }
}
R.surgingScenarios = surgingScen; R.firesWithNoFloor = fires.length;
for (const T of THRS) R.thr['>' + T] = { fires: fires.filter(x => x.hereS > T).length, shareOfSurging: +(100 * fires.filter(x => x.hereS > T).length / surgingScen).toFixed(2) + '%' };
R.minRiderSurgeThatFires = +Math.min(...fires.map(x => x.hereS)).toFixed(3);
const tiers = [...new Set(fires.map(x => x.tier))];
for (const t of tiers) {
  const a = fires.filter(x => x.tier === t), sv = a.map(x => x.saving), pc = a.map(x => x.pct);
  R.floor[t] = { fires: a.length, savingRs_p10_p25_p50_p75: [q(sv, .1), q(sv, .25), q(sv, .5), q(sv, .75)], savingPct_p10_p50: [q(pc, .1), q(pc, .5)], meanFare: Math.round(a.reduce((s, x) => s + x.hereFare, 0) / a.length) };
  R.floor[t].keptAtFloorRs = {};
  for (const fl of [15, 25, 40, 60, 70, 100]) R.floor[t].keptAtFloorRs[fl] = +(100 * a.filter(x => x.saving >= fl).length / a.length).toFixed(1) + '%';
  const lateA = a.filter(x => x.walk > x.eta), lateB = a.filter(x => x.walk - x.eta > 5);
  R.late[t] = { driverArrivesBeforeRiderWalks: +(100 * lateA.length / a.length).toFixed(1) + '%', gapOver5minFreeWait: +(100 * lateB.length / a.length).toFixed(1) + '%', meanGapMin: +(a.reduce((s, x) => s + Math.max(0, x.walk - x.eta), 0) / a.length).toFixed(1), eta: a[0].eta };
}
globalThis.__STUDY = R;
`;
vm.runInThisContext(code + '\n' + body);
const out = JSON.stringify(globalThis.__STUDY, null, 2);
fs.writeFileSync(path.join(__dirname, 'pickup_threshold_study_results.json'), out);
console.log(out);

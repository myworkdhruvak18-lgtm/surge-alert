const band = m => (m < 330 || m >= 1380) ? 'overnight' : m < 450 ? 'early morning' : m < 630 ? 'morning peak' : m < 1020 ? 'midday' : m < 1230 ? 'evening peak' : 'late evening';
const S = {
  scenarios: 0, silentForecast: 0, violationCount: 0, violations: [],
  caseCounts: { case1: 0, case2: 0, both: 0, merged: 0, neither: 0 },
  surgeActive: { scenarios: 0, case1: 0 },
  laneScenarios: { scenarios: 0, case2: 0, case2NoSurge: 0, noSurgeScenarios: 0 },
  candidateEvals: 0, candidatesUnavailable: 0,
  byTier: {}, byRoute: {}, byBand: {}, byRain: {}, byEvent: {}, unavailByBand: {}, unavailByTier: {},
};
const bump = (o, k, f) => { o[k] = o[k] || { scenarios: 0, case1: 0, case2: 0 }; o[k][f]++; };
const bumpU = (o, k, unav) => { o[k] = o[k] || { evals: 0, unavailable: 0 }; o[k].evals++; if (unav) o[k].unavailable++; };
const bad = (msg, ctx) => { S.violationCount++; if (S.violations.length < 15) S.violations.push({ msg, ctx }); };

for (let ri = 0; ri < 5; ri++) for (const dow of [1, 5]) for (let m = 0; m < 1440; m += 15) for (const rain of [0, 1]) for (const event of [0, 1]) {
  state.routeIdx = ri; state.dow = dow; state.minutes = m; state.rain = rain; state.event = event;
  const f = F();
  for (const sel of PICKUPS[ri]) {
    state.pickupId = sel.own ? null : sel.id;
    for (let ti = 0; ti < TIERS.length; ti++) {
      state.chosenTier = ti;
      const t = TIERS[ti], rec = pickupRecs();
      const ctx = { route: ri, dow, time: fmtTime(m), rain, event, sel: sel.id, tier: t.name };
      S.scenarios++;
      const dims = [[S.byTier, t.name], [S.byRoute, 'R' + ri], [S.byBand, band(m)], [S.byRain, 'rain=' + rain], [S.byEvent, 'event=' + event]];
      dims.forEach(([o, k]) => bump(o, k, 'scenarios'));
      if (f.status !== 'ok') {
        S.silentForecast++;
        if (rec.case1 || rec.case2) bad('recommendation while route forecast is silent', ctx);
        continue;
      }
      const base = f.multiplier;
      const mult = p => tierMult(1 + (base - 1) * p.zoneFactor, t.sens);
      const hereMult = mult(sel);
      const surging = hereMult >= 1.3;
      if (surging) S.surgeActive.scenarios++;
      if (sel.interior && t.access > 0) { S.laneScenarios.scenarios++; if (hereMult < 1.02) S.laneScenarios.noSurgeScenarios++; }

      PICKUPS[ri].forEach(p => {
        if (p.own || p.id === sel.id) return;
        const unav = supplyScore(p, t) < AVAILABLE_MIN;
        S.candidateEvals++; if (unav) S.candidatesUnavailable++;
        bumpU(S.unavailByBand, band(m), unav); bumpU(S.unavailByTier, t.name, unav);
      });

      const c1 = rec.case1, c2 = rec.case2;
      if (c1) {
        const drop = hereMult - Math.max(1, mult(c1));
        if (c1.walkMin > 5) bad('case 1 beyond the 5 min cap', ctx);
        if (drop < 0.3 - 1e-9) bad('case 1 drop under 0.30', { ...ctx, drop });
        if (supplyScore(c1, t) < 0.5) bad('case 1 candidate unavailable', ctx);
        if (c1.id === sel.id || c1.own) bad('case 1 recommends the selected or own point', ctx);
        if (!(c1.fare < rec.hereFare)) bad('case 1 is not cheaper', ctx);
        if (ti === 0) bad('two-wheeler got a case 1 card', ctx);
      }
      if (c2) {
        if (c2.kind !== 'main') bad('case 2 on a non-main-road point', ctx);
        if (c2.walkMin > 3) bad('case 2 beyond 3 min', ctx);
        if (!sel.interior) bad('case 2 from a spot that is not on a lane', ctx);
        if (t.access <= 0) bad('case 2 for a ride type with no access benefit', ctx);
        if (c2.saving < 10 - 1e-9) bad('case 2 saving under 10 rupees', { ...ctx, saving: c2.saving });
        if (supplyScore(c2, t) < 0.5) bad('case 2 candidate unavailable', ctx);
        if (!(c2.fare < rec.hereFare)) bad('case 2 is not cheaper', ctx);
      }
      if (rec.merged && !(c1 && c2 && c1.id === c2.id)) bad('merged flag without matching points', ctx);
      if (c1) { S.caseCounts.case1++; bump(S.byTier, t.name, 'case1'); bump(S.byRoute, 'R' + ri, 'case1'); bump(S.byBand, band(m), 'case1'); bump(S.byRain, 'rain=' + rain, 'case1'); bump(S.byEvent, 'event=' + event, 'case1'); if (surging) S.surgeActive.case1++; }
      if (c2) { S.caseCounts.case2++; bump(S.byTier, t.name, 'case2'); bump(S.byRoute, 'R' + ri, 'case2'); bump(S.byBand, band(m), 'case2'); bump(S.byRain, 'rain=' + rain, 'case2'); bump(S.byEvent, 'event=' + event, 'case2'); if (sel.interior && t.access > 0) { S.laneScenarios.case2++; if (hereMult < 1.02) S.laneScenarios.case2NoSurge++; } }
      if (c1 && c2) S.caseCounts.both++;
      if (rec.merged) S.caseCounts.merged++;
      if (!c1 && !c2) S.caseCounts.neither++;
    }
  }
}
globalThis.__SWEEP = S;

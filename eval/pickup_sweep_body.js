const band = m => (m < 330 || m >= 1380) ? 'overnight' : m < 450 ? 'early morning' : m < 630 ? 'morning peak' : m < 1020 ? 'midday' : m < 1230 ? 'evening peak' : 'late evening';
const S = {
  scenarios: 0, silentForecast: 0, violationCount: 0, violations: [],
  fires: 0, surgeActive: { scenarios: 0, fires: 0 },
  candidateEvals: 0, candidatesUnavailable: 0,
  bikeRupeeSavings: { fires: 0, under20: 0, min: null, max: null },
  blockedByRupeeFloor: {}, blockedTotal: 0,
  requote: {}, requoteByTier: {}, requoteSilent: 0,
  byTier: {}, byRoute: {}, byBand: {}, byRain: {}, byEvent: {}, unavailByBand: {}, unavailByTier: {},
};
const bump = (o, k, f) => { o[k] = o[k] || { scenarios: 0, fires: 0 }; o[k][f]++; };
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
      [[S.byTier, t.name], [S.byRoute, 'R' + ri], [S.byBand, band(m)], [S.byRain, 'rain=' + rain], [S.byEvent, 'event=' + event]].forEach(([o, k]) => bump(o, k, 'scenarios'));
      if (f.status !== 'ok') {
        S.silentForecast++;
        if (rec.case1) bad('recommendation while route forecast is silent', ctx);
        continue;
      }
      const base = f.multiplier;
      const hereS = 1 + (base - 1) * sel.zoneFactor;
      const surging = hereS >= 1.3;
      if (surging) S.surgeActive.scenarios++;
      PICKUPS[ri].forEach(p => {
        if (p.own || p.id === sel.id) return;
        const unav = supplyScore(p, t) < AVAILABLE_MIN;
        S.candidateEvals++; if (unav) S.candidatesUnavailable++;
        bumpU(S.unavailByBand, band(m), unav); bumpU(S.unavailByTier, t.name, unav);
      });
      const c1 = rec.case1;
      if (!c1) {
        const wouldFire = PICKUPS[ri].some(p => !p.own && p.id !== sel.id && p.walkMin <= 5 && supplyScore(p, t) >= 0.5 && hereS - Math.max(1, 1 + (base - 1) * p.zoneFactor) >= 0.3 - 1e-9);
        if (wouldFire) { S.blockedByRupeeFloor[t.name] = (S.blockedByRupeeFloor[t.name] || 0) + 1; S.blockedTotal++; }
        continue;
      }
      const drop = hereS - Math.max(1, 1 + (base - 1) * c1.zoneFactor);
      if (c1.walkMin > 5) bad('beyond the 5 min cap', ctx);
      if (drop < 0.3 - 1e-9) bad('zone surge drop under 0.30', { ...ctx, drop });
      if (supplyScore(c1, t) < 0.5) bad('candidate unavailable', ctx);
      if (c1.id === sel.id || c1.own) bad('recommends the selected or own point', ctx);
      if (!(c1.fare < rec.hereFare)) bad('not cheaper', ctx);
      if (c1.saving < 15 - 1e-9) bad('saving under 15 rupees', { ...ctx, saving: c1.saving });
      const expFare = route().baseFare * t.ratio * tierMult(Math.max(1, 1 + (base - 1) * c1.zoneFactor), t.sens);
      if (Math.abs(expFare - c1.fare) > 1e-6) bad('shown fare does not use the floored surge', ctx);
      const better = PICKUPS[ri].filter(p => !p.own && p.id !== sel.id && p.walkMin <= 5 && supplyScore(p, t) >= 0.5 && hereS - Math.max(1, 1 + (base - 1) * p.zoneFactor) > drop + 1e-9);
      if (better.length) bad('a bigger-drop qualifying point exists', ctx);
      S.fires++;
      [[S.byTier, t.name], [S.byRoute, 'R' + ri], [S.byBand, band(m)], [S.byRain, 'rain=' + rain], [S.byEvent, 'event=' + event]].forEach(([o, k]) => bump(o, k, 'fires'));
      if (surging) S.surgeActive.fires++;
      for (let cv = 0; cv < 3; cv++) {
        state.convergence = cv;
        const keepMin = state.minutes;
        state.minutes = Math.min(1425, m + c1.walkMin);
        const q = requoteResult({ fromId: sel.id, toId: c1.id, tier: ti, walkMin: c1.walkMin });
        state.minutes = keepMin;
        const rq = (S.requote[cv] = S.requote[cv] || { total: 0, held: 0 });
        const rt = (S.requoteByTier[t.name] = S.requoteByTier[t.name] || [{ total: 0, held: 0 }, { total: 0, held: 0 }, { total: 0, held: 0 }]);
        rq.total++; rt[cv].total++;
        if (q.silent) { S.requoteSilent++; continue; }
        if (q.ok) { rq.held++; rt[cv].held++; }
        if (q.ok && (q.saving < 15 - 1e-9 || q.drop < 0.3 - 1e-9)) bad('re-quote passes but breaks the rules', { ...ctx, cv });
        if (!q.ok && q.saving >= 15 && q.drop >= 0.3) bad('re-quote fails though the rules hold', { ...ctx, cv });
        if (q.toSurge < 1 - 1e-9) bad('re-quoted surge under the 1.0 floor', { ...ctx, cv });
      }
      state.convergence = 0;
      if (ti === 0) {
        const b = S.bikeRupeeSavings;
        b.fires++; if (c1.saving < 20) b.under20++;
        b.min = b.min == null ? c1.saving : Math.min(b.min, c1.saving);
        b.max = b.max == null ? c1.saving : Math.max(b.max, c1.saving);
      }
    }
  }
}
globalThis.__SWEEP = S;

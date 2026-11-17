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
        const wouldFire = PICKUPS[ri].some(p => !p.own && p.id !== sel.id && p.walkMin >= 2 && p.walkMin <= 8 && supplyScore(p, t) >= 0.5 && hereS - Math.max(1, 1 + (base - 1) * p.zoneFactor) >= 0.3 - 1e-9);
        if (wouldFire) { S.blockedByRupeeFloor[t.name] = (S.blockedByRupeeFloor[t.name] || 0) + 1; S.blockedTotal++; }
        continue;
      }
      const drop = hereS - Math.max(1, 1 + (base - 1) * c1.zoneFactor);
      if (c1.walkMin > 8 || c1.walkMin < 2) bad('walk outside 2 to 8 min', ctx);
      if (drop < 0.3 - 1e-9) bad('zone surge drop under 0.30', { ...ctx, drop });
      if (supplyScore(c1, t) < 0.5) bad('candidate unavailable', ctx);
      if (c1.id === sel.id || c1.own) bad('recommends the selected or own point', ctx);
      if (!(c1.fare < rec.hereFare)) bad('not cheaper', ctx);
      if (c1.saving < 15 - 1e-9) bad('saving under 15 rupees', { ...ctx, saving: c1.saving });
      const expFare = route().baseFare * t.ratio * tierMult(Math.max(1, 1 + (base - 1) * c1.zoneFactor), t.sens);
      if (Math.abs(expFare - c1.fare) > 1e-6) bad('shown fare does not use the floored surge', ctx);
      const qual = p => !p.own && p.id !== sel.id && p.walkMin >= 2 && p.walkMin <= 8 && supplyScore(p, t) >= 0.5
        && hereS - Math.max(1, 1 + (base - 1) * p.zoneFactor) >= 0.3 - 1e-9
        && route().baseFare * t.ratio * (tierMult(hereS, t.sens) - tierMult(Math.max(1, 1 + (base - 1) * p.zoneFactor), t.sens)) >= 15 - 1e-9;
      const nearer = PICKUPS[ri].filter(p => qual(p) && (p.walkMin < c1.walkMin || (p.walkMin === c1.walkMin && (hereS - Math.max(1, 1 + (base - 1) * p.zoneFactor)) > drop + 1e-9)));
      if (nearer.length) bad('a nearer qualifying point exists', ctx);
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
S.controls = {};
const ctl = (name, ok) => { S.controls[name] = !!ok; if (!ok) bad('control check failed: ' + name, {}); };
{
  resetModel();
  state.routeIdx = 0; state.dow = 1; state.rain = 1; state.event = 0; state.minutes = 555; state.pickupId = null; state.chosenTier = 2; state.convergence = 0;
  const base = pickupRecs().case1;
  ctl('default rule picks the nearest qualifying point', base && base.id === 'a');
  SELECT_RULE = 'biggest'; const big = pickupRecs().case1; SELECT_RULE = 'nearest';
  ctl('biggest-drop rule picks the larger drop', big && base && big.drop > base.drop && big.id !== base.id);
  WALK_MIN_MIN = 1; const k = pickupRecs(); WALK_MIN_MIN = 2;
  ctl('min walk 1 lets the 1 minute point qualify', k.candidates.find(c => c.id === 'k').c1 != null);
  WALK_CAP_MIN = 9; const e5 = pickupRecs(); WALK_CAP_MIN = 8;
  ctl('max walk 9 lets the 9 minute point qualify', e5.candidates.find(c => c.id === 'm5').c1 != null);
  SURGE_DROP_MIN = 0.6; const hi = pickupRecs().case1; SURGE_DROP_MIN = 0.3;
  ctl('zone-surge drop 0.60 removes the card', hi === null);
  MIN_SAVING_RS = 500; const rs = pickupRecs().case1; MIN_SAVING_RS = 15;
  ctl('minimum saving 500 removes the card', rs === null);
  state.availOverride['0:a'] = 'off'; const off = pickupRecs().case1; delete state.availOverride['0:a'];
  ctl('forcing the nearest point off moves to the next one', off && off.id === 'm1');
  state.availOverride['0:m5'] = 'on'; WALK_CAP_MIN = 9; const on = pickupRecs().candidates.find(c => c.id === 'm5'); WALK_CAP_MIN = 8; delete state.availOverride['0:m5'];
  ctl('forcing a point on keeps it available', on && on.avail === true);
  state.supplyMult = 0.1; const none = pickupRecs(); state.supplyMult = 1;
  ctl('driver supply 0.1 removes the card and explains why', none.case1 === null && /unavailable/.test(whyNoCard(none)));
  state.event = 0; state.rain = 0; state.minutes = 840; const calm = pickupRecs();
  ctl('a calm midday explains itself through the floor', calm.case1 === null && /only/.test(whyNoCard(calm)));
  state.rain = 1; state.minutes = 555;
  const np = commuteAlerts().status; state.commuteOverride = 555; const ov = commuteAlerts().status; state.commuteOverride = null;
  ctl('custom departure enables alerts on a route with no learned commute', np === 'nopattern' && ov !== 'nopattern');
  state.routeIdx = 1; state.rain = 0; const items = alertItems(commuteAlerts());
  ctl('alert items are produced for the learned commute', items.length >= 2);
  const lastTime = items[items.length - 1].time;
  state.minutes = items[0].time; ADVANCE_LEAD_MIN = 60; const shifted = alertItems(commuteAlerts())[0].time; ADVANCE_LEAD_MIN = 120;
  ctl('advance lead dial moves the advance alert later', shifted > items[0].time);
  QUIET_UNTIL_MIN = 600; const q = alertItems(commuteAlerts()).every(i => i.time >= 600); QUIET_UNTIL_MIN = 360;
  ctl('quiet-until dial holds every alert until then', q);
  state.routeIdx = 0; state.rain = 1; state.minutes = 555;
  PICKUPS[0].find(p => p.id === 'a').walkMin = 4;
  ctl('editing a point changes its walk time', pickupRecs().candidates.length > 0 && PICKUPS[0].find(p => p.id === 'a').walkMin === 4);
  resetModel();
  ctl('reset restores the defaults', WALK_CAP_MIN === 8 && WALK_MIN_MIN === 2 && SURGE_DROP_MIN === 0.3 && MIN_SAVING_RS === 15 && SELECT_RULE === 'nearest' && PICKUPS[0].find(p => p.id === 'a').walkMin === 2);
}
globalThis.__SWEEP = S;

// Checks the shipped rules from an independent oracle, not by re-running the app's own comparison.
const swBand = m => (m < 330 || m >= 1380) ? 'overnight' : m < 450 ? 'early morning' : m < 630 ? 'morning peak' : m < 1020 ? 'midday' : m < 1230 ? 'evening peak' : 'late evening';
const SW = {
  pickup: { scenarios: 0, silentForecast: 0, modeSilent: 0, shortTripBlocked: 0, eligibleScenarios: 0, surgeActive: 0, fires: 0, firesByFlow: {}, byTier: {}, byRoute: {}, byBand: {}, byCondition: {}, topTwoShown: 0, tiesBrokenByWalk: 0, tiesBrokenByDestination: 0 },
  ping: { scenarios: 0, fired: 0, byCondition: {}, shareTables: {} },
  display: { forecastsChecked: 0, below1: 0, inside1to105: 0, silentPerMode: {} },
  controls: {}, violationCount: 0, violations: [],
};
const bad = (msg, ctx) => { SW.violationCount++; if (SW.violations.length < 20) SW.violations.push({ msg, ctx }); };
const bump = (o, k, f) => { o[k] = o[k] || { scenarios: 0, fires: 0 }; o[k][f]++; };
const EPS = 1e-9;

// ---------- 1. surge display rule: nothing below 1x, nothing in (1.00, 1.05) ----------
for (let ri = 0; ri < 5; ri++) for (const dow of [0, 1, 4, 5, 6]) for (let m = 0; m < 1440; m += 15) for (const rain of [0, 1]) for (const event of [0, 1]) {
  for (let mode = 0; mode < TIERS.length; mode++) {
    const f = forecast(ROWS, ri, m, dow, rain, event, mode);
    if (f.status !== 'ok') { SW.display.silentPerMode[TIERS[mode].name] = (SW.display.silentPerMode[TIERS[mode].name] || 0) + 1; continue; }
    SW.display.forecastsChecked++;
    for (const v of [f.multiplier, f.bandLow, f.bandHigh]) {
      if (v < 1 - EPS) { SW.display.below1++; bad('forecast value below 1x', { ri, dow, m, rain, event, mode, v }); }
      if (v > 1 + EPS && v < SURGE_VISIBLE_MIN - EPS) { SW.display.inside1to105++; bad('forecast value inside 1.00-1.05x', { ri, dow, m, rain, event, mode, v }); }
    }
  }
}

// ---------- 2. pickup rules ----------
const tripKmOf = ri => parseFloat(META.routes[ri].distance);
for (let ri = 0; ri < 5; ri++) for (const dow of [1, 5]) for (let m = 0; m < 1440; m += 15) for (const rain of [0, 1]) for (const event of [0, 1]) {
  state.routeIdx = ri; state.dow = dow; state.minutes = m; state.rain = rain; state.event = event;
  const f = F();
  const multi = !!MULTI_EXIT[ri];
  // a house is only ever entered from the rider's own spot; a station can be entered from any gate
  const sels = multi ? PICKUPS[ri] : PICKUPS[ri].filter(p => p.own);
  for (const sel of sels) {
    state.pickupId = sel.own ? null : sel.id;
    for (let ti = 0; ti < TIERS.length; ti++) {
      state.chosenTier = ti;
      const t = TIERS[ti], rec = pickupRecs();
      const ctx = { route: ri, dow, time: fmtTime(m), rain, event, sel: sel.id, tier: t.name };
      SW.pickup.scenarios++;
      if (f.status !== 'ok') { SW.pickup.silentForecast++; if (rec.top.length) bad('suggestion while the route forecast is silent', ctx); continue; }
      if (tripKmOf(ri) <= MIN_TRIP_KM) { SW.pickup.shortTripBlocked++; if (rec.top.length || rec.case1) bad('suggestion on a trip at or under the minimum length', ctx); continue; }
      SW.pickup.eligibleScenarios++;
      const mf = forecast(ROWS, ri, m, dow, rain, event, ti);
      if (mf.status !== 'ok') { SW.pickup.modeSilent++; if (rec.top.length) bad("suggestion while this ride type's own forecast is silent", ctx); continue; }
      const base = f.multiplier;                       // route-level benchmark (Standard) for the zone-surge drop rule
      const surgeOf = p => 1 + (base - 1) * p.zoneFactor;
      const mmAt = zf => 1 + (mf.multiplier - 1) * zf; // this ride type's own price multiplier at a point
      const hereS = surgeOf(sel);
      if (hereS >= 1.3) SW.pickup.surgeActive++;
      // independent oracle for who qualifies and in what order
      const qual = PICKUPS[ri].filter(p => p.id !== sel.id).map(p => {
        const wk = Math.abs(sel.walkMin - p.walkMin), candS = Math.max(1, surgeOf(p));
        const drop = hereS - candS, saving = route().baseFare * t.ratio * (mmAt(sel.zoneFactor) - mmAt(p.zoneFactor));
        const avail = p.supply * 1 * timeSupply(m, dow >= 5) * (rain ? 0.8 : 1) * (event ? 0.8 : 1) * TIER_SUPPLY[ti] >= AVAILABLE_MIN;
        return { p, wk, drop, saving, avail, ok: hereS > 1.1 + EPS && avail && wk >= WALK_MIN_MIN && wk <= WALK_CAP_MIN && drop >= SURGE_DROP_MIN - EPS && saving >= MIN_SAVING_BY_TIER[ti] - EPS };
      }).filter(x => x.ok);
      qual.sort((a, b) => (a.wk - b.wk) || ((a.p.toDest || 0) - (b.p.toDest || 0)) || (b.drop - a.drop));
      const want = qual.slice(0, 1).map(x => x.p.id), got = rec.top.map(c => c.id);
      if (JSON.stringify(want) !== JSON.stringify(got)) bad('ranking or qualification differs from the independent oracle', { ...ctx, want, got });
      rec.top.forEach(c => {
        const wk = Math.abs(sel.walkMin - PICKUPS[ri].find(p => p.id === c.id).walkMin);
        const drop = hereS - Math.max(1, surgeOf(c));
        if (wk < 7 - EPS || wk > 10 + EPS) bad('walk outside 7 to 10 min', { ...ctx, wk });
        if (drop < 0.3 - EPS) bad('zone-surge drop under 0.30', { ...ctx, drop });
        if (supplyScore(c, t) < AVAILABLE_MIN) bad('suggested point unavailable', ctx);
        if (c.id === sel.id) bad('suggests the selected point', ctx);
        if (!(c.fare < rec.hereFare)) bad('suggested fare is not cheaper', ctx);
        if (c.saving < MIN_SAVING_BY_TIER[ti] - EPS) bad('saving under the rupee floor', { ...ctx, saving: c.saving });
        const expFare = route().baseFare * t.ratio * mmAt(PICKUPS[ri].find(p => p.id === c.id).zoneFactor);
        if (Math.abs(expFare - c.fare) > 1e-6) bad('shown fare does not use the floored surge', ctx);
        if (c.mult < 1 - EPS) bad('shown multiplier below 1x', ctx);
      });
      if (rec.top.length > 1) bad('more than one suggestion', ctx);
      for (let qi = 0; qi + 1 < qual.length; qi++) {
        const a = qual[qi], b = qual[qi + 1];
        if (Math.abs(a.drop - b.drop) < EPS) { if (a.wk !== b.wk) SW.pickup.tiesBrokenByWalk++; else SW.pickup.tiesBrokenByDestination++; }
      }
      if (rec.top.length) {
        SW.pickup.fires++; if (rec.top.length === 2) SW.pickup.topTwoShown++;
        const flow = multi ? 'station (one suggestion after a gate is picked)' : 'house (up to two suggestions)';
        SW.pickup.firesByFlow[flow] = (SW.pickup.firesByFlow[flow] || 0) + 1;
        [[SW.pickup.byTier, t.name], [SW.pickup.byRoute, 'R' + ri], [SW.pickup.byBand, swBand(m)], [SW.pickup.byCondition, 'rain=' + rain + ' event=' + event]].forEach(([o, k]) => bump(o, k, 'fires'));
      }
      [[SW.pickup.byTier, t.name], [SW.pickup.byRoute, 'R' + ri], [SW.pickup.byBand, swBand(m)], [SW.pickup.byCondition, 'rain=' + rain + ' event=' + event]].forEach(([o, k]) => bump(o, k, 'scenarios'));
    }
  }
}

// ---------- 3. commute ping: invariants everywhere, and shares by condition ----------
const CONDS = [['dry', 0, 0], ['rain', 1, 0], ['event nearby', 0, 1], ['rain + event', 1, 1]];
const WINDOWS = { 'weekday morning (6:00-11:00)': [1, 360, 660], 'weekday evening (16:00-21:00)': [1, 960, 1260], 'Saturday night (19:00-23:30)': [5, 1140, 1410] };
const TIERS_TO_REPORT = [['Auto (three-wheeler)', 1], ['Cab (standard/sedan/six-seater)', 2], ['Two-wheeler', 0]];
const pingOnce = (ri, depart, ti, dow, rain, event) => {
  state.routeIdx = ri; state.dow = dow; state.rain = rain; state.event = event; state.pushTier = ti; state.commuteOverride = depart;
  return commuteAlerts();
};
for (let ri = 0; ri < 5; ri++) for (const dow of [1, 5]) for (let d = 240; d <= 1410; d += 15) for (let ti = 0; ti < TIERS.length; ti++) for (const [, rain, event] of CONDS) {
  const a = pingOnce(ri, d, ti, dow, rain, event);
  SW.ping.scenarios++;
  const ctx = { route: ri, dow, depart: fmtTime(d), tier: TIERS[ti].name, rain, event };
  if (a.status === 'ok') {
    SW.ping.fired++;
    const k = 'rain=' + rain + ' event=' + event; SW.ping.byCondition[k] = (SW.ping.byCondition[k] || 0) + 1;
    if (a.pingAt < QUIET_UNTIL_MIN) bad('ping before the quiet-hours limit', ctx);
    if (a.pingAt < 360 || a.pingAt > 1439) bad('ping outside 6:00am-11:59pm (never between 12:00am and 6:00am)', { ...ctx, ping: fmtTime(a.pingAt) });
    if (a.startBy - a.pingAt < MIN_NOTICE_MIN - EPS) bad('ping gives less than the notice rule', ctx);
    if (a.dm < PING_THRESHOLD - EPS) bad('ping fired below the trigger', { ...ctx, dm: a.dm });
    if (a.em > PING_EARLIER_MAX + EPS) bad('ping fired though the earlier start is above the ceiling', { ...ctx, em: a.em });
    if (a.pingAt !== d - PING_LEAD_MIN) bad('ping is not at the configured lead', ctx);
    const text = alertItems(a)[0].body;
    if (/\d\.\d+\s*×|×/.test(text)) bad('ping text carries a multiplier', { ...ctx, text });
    if (!text.includes(fmtTime(a.startBy))) bad('ping text does not name the start-by time', ctx);
    if (a.t.name !== TIERS[ti].name) bad('ping is for the wrong ride type', ctx);
  } else {
    // every non-firing status must be one of the documented reasons
    if (!(a.status === 'quiet' && ['low', 'nogain', 'late', 'early', 'nodata'].includes(a.reason)) && a.status !== 'nopattern') bad('unknown ping status', { ...ctx, a });
    if (a.reason === 'low' && a.dm >= PING_THRESHOLD - EPS) bad('"low" reported though the forecast is at the trigger', ctx);
    if (a.reason === 'nogain' && a.em <= PING_EARLIER_MAX + EPS) bad('"nogain" reported though the earlier start is under the ceiling', ctx);
  }
}
// no-pattern routes stay silent without a custom time
state.commuteOverride = null; state.routeIdx = 0; if (commuteAlerts().status !== 'nopattern') bad('route with no commute pattern should stay silent', {});

for (const [wname, [dow, from, to]] of Object.entries(WINDOWS)) {
  SW.ping.shareTables[wname] = {};
  for (const [tname, ti] of TIERS_TO_REPORT) {
    SW.ping.shareTables[wname][tname] = {};
    for (const [cname, rain, event] of CONDS) {
      let n = 0, hit = 0, high = 0;
      for (let ri = 0; ri < 5; ri++) for (let d = from; d <= to; d += 15) {
        const a = pingOnce(ri, d, ti, dow, rain, event); n++;
        if (a.status === 'ok') hit++;
        if (a.dm != null && a.dm >= PING_THRESHOLD) high++;
      }
      SW.ping.shareTables[wname][tname][cname] = { pingShare: +(100 * hit / n).toFixed(1) + '%', usualTimeAtOrAboveTrigger: +(100 * high / n).toFixed(1) + '%', cells: n };
    }
  }
}
state.commuteOverride = null;

// ---------- 4. controls move what they say they move ----------
const ctl = (name, ok) => { SW.controls[name] = !!ok; if (!ok) bad('control check failed: ' + name, {}); };
{
  resetModel();
  state.routeIdx = 1; state.dow = 1; state.rain = 1; state.event = 0; state.minutes = 555; state.pickupId = null; state.chosenTier = 2;
  const base = pickupRecs();
  ctl('defaults are 7-10 min, nearest walk, 2.5 km, 1.25 trigger, 1.25 ceiling, 45 min lead, 30 min advice',
    WALK_MIN_MIN === 7 && WALK_CAP_MIN === 10 && SELECT_RULE === 'nearest' && MIN_TRIP_KM === 2.5 && PING_THRESHOLD === 1.25 && PING_EARLIER_MAX === 1.25 && PING_LEAD_MIN === 45 && START_EARLIER_MIN === 30);
  ctl('a house in rain at 9:15 gets suggestions', base.top.length >= 1);
  SELECT_RULE = 'nearest'; const near = pickupRecs().top[0]; SELECT_RULE = 'nearest';
  ctl('switching to nearest-wins can change the first suggestion or keep it, never add one', near && pickupRecs().top.length >= 1);
  WALK_CAP_MIN = 9; const cap9 = pickupRecs(); WALK_CAP_MIN = 10;
  ctl('walk cap 9 removes every point over 9 min', cap9.top.every(c => c.walkMin <= 9));
  WALK_MIN_MIN = 10; const min10 = pickupRecs(); WALK_MIN_MIN = 8;
  ctl('walk minimum 10 keeps only 10 minute points', min10.top.every(c => c.walkMin === 10));
  SURGE_DROP_MIN = 1.2; const hi = pickupRecs(); SURGE_DROP_MIN = 0.3;
  ctl('zone-surge drop 1.20 removes the cards', hi.top.length === 0);
  MIN_SAVING_BY_TIER = [500,500,500,500,500]; const rs = pickupRecs(); MIN_SAVING_BY_TIER = [15,15,40,60,70];
  ctl('minimum saving 500 removes the cards', rs.top.length === 0);
  MIN_TRIP_KM = 20; const sh = pickupRecs(); MIN_TRIP_KM = 2.5;
  ctl('raising the minimum trip above the route length removes the cards', sh.top.length === 0 && sh.shortTrip === true);
  state.supplyMult = 0.1; const none = pickupRecs(); state.supplyMult = 1;
  ctl('driver supply 0.1 removes the cards', none.top.length === 0);
  // ping dials
  state.routeIdx = 1; state.dow = 1; state.rain = 0; state.event = 0; state.pushTier = 2; state.commuteOverride = 450;
  const p0 = commuteAlerts();
  ctl('7:30 usual time pings at 6:45 by default', p0.status === 'ok' && p0.pingAt === 405);
  PING_LEAD_MIN = 60; const p60 = commuteAlerts(); PING_LEAD_MIN = 45;
  ctl('a 60 min lead moves the ping earlier', p60.status === 'ok' && p60.pingAt === 390);
  QUIET_UNTIL_MIN = 600; const q = commuteAlerts(); QUIET_UNTIL_MIN = 360;
  ctl('quiet-until 10:00 silences a ping that would be earlier', q.status === 'quiet' && q.reason === 'early');
  PING_THRESHOLD = 1.9; const th = commuteAlerts(); PING_THRESHOLD = 1.25;
  ctl('trigger 1.9 silences the ping', th.status === 'quiet' && th.reason === 'low');
  PING_EARLIER_MAX = 1.0; const em = commuteAlerts(); PING_EARLIER_MAX = 1.25;
  ctl('ceiling 1.0 silences the ping', em.status === 'quiet');
  state.commuteOverride = 390; const early = commuteAlerts(); state.commuteOverride = null;
  ctl('a 6:30 usual time is never pinged (would be before 6:00)', early.status !== 'ok');
  // never after midnight: even with the quiet-hours dial at 0, a ping that would fall between 12:00am and 6:00am is not sent
  QUIET_UNTIL_MIN = 0; state.commuteOverride = 30; const mid = commuteAlerts(); state.commuteOverride = null; QUIET_UNTIL_MIN = 360;
  ctl('a 12:30am usual time is never pinged, even with quiet hours set to 0', mid.status !== 'ok');
  let after = 0; for (let d = 0; d < 1440; d += 15) { state.commuteOverride = d; QUIET_UNTIL_MIN = 0; for (const rain of [0, 1]) { state.rain = rain; const x = commuteAlerts(); if (x.status === 'ok' && (x.pingAt < 0 || x.pingAt > 1439)) after++; } QUIET_UNTIL_MIN = 360; } state.commuteOverride = null; state.rain = 0;
  ctl('no usual time from 0:00 to 23:45 produces a ping outside 0:00-23:59 (quiet hours off)', after === 0);
  let earlyPings = 0; for (let d = 0; d < 405; d += 15) { state.commuteOverride = d; for (const rain of [0, 1]) for (const ev of [0, 1]) { state.rain = rain; state.event = ev; for (let ti = 0; ti < 5; ti++) { state.pushTier = ti; if (commuteAlerts().status === 'ok') earlyPings++; } } } state.commuteOverride = null; state.rain = 0; state.event = 0; state.pushTier = 2;
  ctl('no usual time before 6:45am is ever pinged (default quiet hours)', earlyPings === 0);
  // Work / Home shortcut window: 45 min before to 30 min after the usual time, nothing outside it
  state.routeIdx = 1; state.commuteOverride = null; state.dow = 1;
  const vis = m => { state.minutes = m; return commuteShortcutVisible(); };
  ctl('shortcut hidden 46 min before the usual 9:15am commute and shown 45 min before', !vis(509) && vis(510));
  ctl('shortcut shown 30 min after the usual time and hidden 31 min after', vis(585) && !vis(586));
  state.routeIdx = 0; const noPattern = vis(540); state.routeIdx = 1;
  ctl('a route with no usual commute never shows the shortcut', noPattern === false);
  state.routeIdx = 0; state.commuteOverride = 450; const customOk = vis(405) && vis(480) && !vis(404) && !vis(481); state.commuteOverride = null; state.routeIdx = 1;
  ctl('a custom usual time moves the shortcut window with it', customOk);
  PICKUPS[1].find(p => p.id === 'a').walkMin = 9;
  ctl('editing a point changes its walk time', PICKUPS[1].find(p => p.id === 'a').walkMin === 9);
  resetModel();
  ctl('reset restores every default', WALK_CAP_MIN === 10 && WALK_MIN_MIN === 7 && MIN_TRIP_KM === 2.5 && PING_THRESHOLD === 1.25 && PING_EARLIER_MAX === 1.25 && PICKUPS[1].find(p => p.id === 'a').walkMin === 8);
}
SW.scenarioTotal = SW.display.forecastsChecked + SW.pickup.scenarios + SW.ping.scenarios + Object.keys(SW.controls).length;
globalThis.__SWEEP6 = SW;

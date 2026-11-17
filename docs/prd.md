# PRD — Surge Alert: Route Fare Forecast & Timing Nudge

**Status:** Draft v5 — added pickup-point recommendations (fare-driven zone-shift + access-driven main-road shift), 2026-11-17 · **Owner:** Dhruva (solo, PM portfolio project) · **Timeline:** 2-4 weeks, spec through demo · **Platform:** Uber only (v1)
**Full research/rationale lives in `brainstorm-notes.md`.** This doc is the build-facing spec, restructured after reviewing the team's "Inline Rating" PRD format (Background → Objective → Current Construct → Limitations → Proposed Construct, numbered and state-driven) so it reads the way an engineer expects a spec to read: rules and thresholds first, narrative rationale kept to the Background section only.

---

## Background

Today, a rider only sees a fare's surge multiplier at the moment of booking, with no context attached. The number carries no history — the app doesn't say whether it's normal for this route at this hour, whether it's still climbing or already easing, or whether waiting a few minutes changes anything. The decision is made blind, and collapses to a binary: pay it, or abandon the trip. In practice a third path exists — the rider opens a competitor app to compare — which is the worst outcome for Uber of the three.

To fix this, a forecast engine will read the rider's own historical fare data and the current fare, and surface honest price context — current-vs-normal, and where confident, a short-horizon direction — inline at the moment a destination is set, before the rider commits to booking.

**Why per-mode, not just per-route (added v4):** India-specific research complicates the "wait for it to ease" premise the v1-v3 spine leaned on. The CCI's 2022 market study (2,000 riders, Delhi/Mumbai/Jaipur/Indore) found that when facing a surge, Indian riders overwhelmingly **substitute mode, not time** — Delhi riders shift to metro, Mumbai riders to autos, Tier-II riders to personal vehicles — rather than waiting the surge out. That's a materially different behavior than the "hold on, it eases in ~12 min" model the time-series surface (`S1`-`S3`) is built around. It doesn't invalidate the wait-based forecast (heavy/frequent riders — this product's primary persona — showed the highest tolerance for waiting and highest surge tolerance in the same study), but it means mode-shift can't stay a single "Least affected" tag bolted onto the cab flow — it needs to be a real, independently-forecast signal so a rider can compare *this route's* current Auto multiplier against its Bike or Go multiplier, not just be told one mode happens to be cheaper right now.

**Why pickup-point recommendations, and why now (added v5):** v4's action hierarchy covers timing (wait) and mode (shift), but not location — a rider at a high-surge pickup point today has no way to know that walking a short distance would put them in a materially cheaper zone, or that their exact spot (an interior lane) is itself the reason their pickup options look worse. v1-v4 deferred this as "Zone-shift recommendations... needs per-cell surge data the v1 seed set doesn't have" (see the superseded Non-Goals entry below). Research done for this version (full detail in `brainstorm-notes.md`) found: **no India ride-hailing app publicly ships a fare-motivated pickup-shift feature** — not Rapido (its surge-related product, Power Pass, is a paid flat-fare subscription, unrelated to pickup suggestions), not Ola, not Uber. The closest real precedent is Uber's own documented pickup-point system in Jaipur's old city, which relocates pickups from narrow interior lanes to the main road — but that's an **access/wait-time fix** (drivers physically can't reach narrow lanes), not a fare feature. This means: (a) the general fare-driven zone-shift idea is original to this project, not a copy of an existing feature, and (b) the access-driven "interior lane → main road" pattern has a real precedent to build on, just not for the reason this spec extends it. Treat both honestly as such in any write-up — see Sections 10a/10b.

## Objective

- Show price context (current fare vs. typical-for-this-route-and-hour) at destination-set, for every route, with no personalization required.
- Where the engine has enough history to be confident, show a short-horizon forecast (30–90 min) and a recommended action.
- **Forecast and display surge independently per ride mode** (Bike, Auto, Go/Hatchback, Premier, XL, etc.) on a given route — not one multiplier scaled by a fixed per-mode ratio. Modes surge on different curves (different vehicle supply pools, different demand elasticity), and the mode-shift action only works if the alternative's own multiplier is real, not assumed.
- Never show a forecast the engine isn't confident in — silence is the fallback, not a guess. Confidence gating applies per mode, not just per route: a route can be confident for Auto and silent for Premier if Premier has too few historical trips on that route.
- Pair every "wait, it'll be cheaper" message with an action that keeps the rider inside the Uber flow (notify-when-drops, schedule-later, or a cheaper mode/zone) — a wait message with no action attached must never render.
- Extend the same engine to a scheduled push for riders with a learned commute pattern, so the pull (in-app) and push (notification) surfaces are one model, not two.
- Beat a naive "surge = rush hour" baseline on forecast precision/recall, evaluated on held-out data, to prove the model adds real signal — evaluated per mode as well as in aggregate, since a model that's accurate for cabs but noisy for autos would overstate its own reliability.
- **Added v5:** where the data supports it, recommend a specific nearby pickup point — either because it's in a materially cheaper surge zone (fare-driven), or because the rider's current spot is itself degrading their pickup options (access-driven, e.g. an interior lane) — always showing the price difference between "here" and "there," never a silent redirect.

## Current Construct

There is no existing forecast surface. The rider sees a single point-in-time multiplier and fare at the ride-selection screen (`B1` in the Wayfare canvas), sourced directly from Uber's live pricing — no history, no trend, no recommendation. Every ride type in the list shows its own live fare today, but there is no forecast, trend, or cross-mode comparison attached to any of them.

### Limitations

- No way for a rider to tell if the current fare is typical or an outlier for this route/hour.
- No signal on direction — rising, falling, or flat — so waiting is a pure guess.
- No action offered besides book-now; a rider who wants to defer has nothing to hold onto and no reason to stay in the app.
- No distinction between a route the system knows well and one it has never seen — every fare is presented with the same (false) confidence.
- No per-mode differentiation in the forecast layer — a rider comparing Auto vs. Bike vs. Go today is comparing four live prices with no sense of which is temporarily inflated and which is normal.
- Uber's own "Ride Pass" addresses part of this (US-only, locks price on up to 10 saved routes) but doesn't explain a fare, only insulates the rider from it, and isn't available in India.

## Proposed Construct

### 1. Eligibility

The forecast engine runs on **every** destination-set event — no saved-route or opt-in requirement. Eligibility for a **confident forecast** (vs. current-price-only) is decided **per (route, mode, time-of-day, day-type)** match against ride history — mode is now part of the match key, not a post-hoc adjustment:

| Condition | Result |
|---|---|
| ≥ 8 comparable historical trips matched for this route **and mode** (time window, conditions relaxed progressively) | Forecast shown for that mode, confidence scored |
| < 8 route+mode matches, but ≥ 8 city-wide trips for that mode at the same hour/day-type | Forecast shown, scoped as city-wide, confidence penalized |
| < 8 matches at every fallback tier, for that mode | **Silent for that mode only.** Other modes on the same route are unaffected — each mode's eligibility is evaluated independently |

The confidence floor (currently 8 observations, "confident" at 20+) should remain configurable, not hardcoded, as more real fare history becomes available. Because thin-data modes (e.g. Premier, XL) will hit silence far more often than high-volume modes (Auto, Go), **forecast coverage is now tracked per mode** (see Success Metrics) so a demo doesn't quietly cherry-pick the mode with the best data.

### 2. Forecast Experience

Three variants, by where the rider is in the booking flow and how much history exists. All three now carry a forecast **per mode present in that surface**, not one shared number.

**A. Home screen, learned commute route — full time-series treatment (`S1`/`S2`/`S3`)**
- The chart/trend is shown for the rider's **default or most-recently-booked mode** for that route, with a lightweight mode switcher (matching the app's own mode tabs) that re-renders the same chart against that mode's own history — not a rescaled copy of the default mode's curve.
- *Before* the predicted peak: multiplier trend chart, "likely to hit `<band high>` by `<peak time>`", a "leave by `<time>`, pay `<₹X>` instead of `<₹Y>`" comparison (only shown if the saving clears the 15% materiality threshold), actions **Reserve `<time>`** / **Alert me at 1.0×**.
- *During* the peak: "Surging now · `<multiplier>` · `<₹fare>` right now", "Easing off in about `<N>` min", actions **Alert me at 1.0×** / **Book anyway**, plus a "Cheaper right now" block ranking mode-shift alternatives by savings — each alternative's number is that mode's own live-forecast multiplier, sourced the same way as the primary mode's, never a static discount assumption.
- *After* the peak clears: "Your alert fired · back to normal", "Waiting saved you about `<₹saved>`", action **Book now**.

**B. Ride-selection sheet, any route including one-off trips — compact banner (`B1s`)**
- One banner scoped to the mode with the highest current multiplier on this route: `<multiplier>` · "Fares are high right now" · reason tag (e.g. "Heavy demand") · "drops by `<time>`".
- **Per-row treatment, upgraded from v3:** every row shows its own struck-through pre-surge price *and* its own live multiplier chip (e.g. `Auto 1.2×`, `Bike 1.0×`, `Premier 1.6×`) — not just a binary "Least affected" tag on one row. The tag is kept as a visual highlight on whichever row has the lowest multiplier, but the underlying number is now visible for every mode, so the rider can see the actual gap, not just be told one exists.
- A mode's chip is omitted (not zeroed or guessed) when that mode fails eligibility (Section 1) on this route — same silence principle as the primary forecast, applied per row.
- Actions: **Alert me at 1.0×** / **Reserve `<time>`** (on the selected mode) — mode-shift itself is not a separate action, it's just picking a different row, which is the whole point of making every row's number real.

**C. Receipt, post-trip — transparency only (`D2`)**
- "Trip fare `<multiplier>` `<₹total>` / Base fare at 1.0× `<₹base>`". Unchanged — this reflects the single mode actually booked, so per-mode modeling doesn't apply here by definition.

### 3. Route History & Confidence Basis

Every forecast discloses its own basis in-product (not just in a debug panel): "Based on `<n>` similar trips on this route" or, when city-wide fallback is used, "No history on this route yet — based on `<n>` city-wide trips at this hour." This is a P0 requirement, not a nice-to-have — an undisclosed confidence score is indistinguishable from a guess to the rider. **Now stated per mode**: if the rider switches the mode tab in surface A, or looks at a different row in surface B, the basis line updates to that mode's own `<n>`, never inherited from whichever mode happened to be confident.

### 4. Silent-State Behaviour (`S0`)

When eligibility (Section 1) fails at every tier, **for a given mode**:
- That mode's forecast widget/row-chip does not render — not a low-confidence version of itself, not a greyed-out state.
- Copy (surface A, whole-surface silence when the primary mode has no data): "No fare pattern for `<time>` on this route yet — we'll flag surges once we're sure."
- Copy (surface B, per-row silence): the row simply shows its live price with no multiplier chip — no explanatory microcopy needed per row, since the banner above already carries the "fares are high" context for whichever mode triggered it.
- Current fare and normal booking flow are unaffected for every mode; only the forward-looking layer is withheld, mode by mode.

### 5. Capture Behaviour

Every elevated-price state (A and B above) must render at least one capture action alongside the wait message. Two mechanisms ship in v1:
- **Alert me at `<1.0×>`** — notify-when-drops, re-engagement into the same session. Scoped to the mode the rider had selected when they set the alert.
- **Reserve `<time>`** — a committed scheduled booking at the predicted cheaper time, on that same mode.

A "wait / it'll be cheaper later" message rendered with zero capture actions is a blocking bug, not a design preference — it is a feature that quietly hands the rider to a competitor app. **Mode-shift (picking a cheaper row in `B1s`) counts as a valid capture action in its own right** — it keeps the rider inside the booking flow without requiring them to wait at all, which per the CCI finding is what most Indian riders actually do when surged.

### 6. Dismiss / Snooze Behaviour

| State | Rider action | Result |
|---|---|---|
| Forecast shown, rider dismisses | Tap outside / swipe away | Widget collapses for this session; re-evaluated fresh on next destination-set |
| "Alert me at 1.0×" active, price drops | — | Push fires once, then the alert auto-clears (no repeat pinging) |
| "Reserve `<time>`" booked | — | Handed to the existing Reserve flow; surge forecasting has no further role in that booking |

### 7. Miscellaneous

- Forecasts are always a **band + risk level** (Low / Medium / High), never a single false-precision number, and clipped to India's MVAG 2025 bounds (0.5×–2.0×) — **per mode**, since different vehicle categories may have different effective bounds in practice even under the same national ceiling.
- Existing fare, promo, and receipt logic are unchanged; the forecast layer only adds context, never alters pricing.
- A five-minute fare hold during a stalled driver match (`C1x`) is service recovery for a failed match, not a pricing feature, and must not be generalized into a forward-looking price lock — see Non-Goals.

### 8. Push Surface (Commute Alerts)

For a rider with a learned route pattern, the same engine runs on a schedule instead of on demand, against that rider's **most-frequently-booked mode** for the commute route (not necessarily the cheapest — this is about the trip they actually take):
- Advance alert fires hours ahead of a predicted high-risk window.
- A second, more urgent "last call" alert fires 15–30 min before onset, for riders who missed the first.
- An "all clear" notification fires once the window passes (P1).
- **Quiet hours (added during build):** nothing is delivered before 6:00am. Found while building the simulator: on a rainy morning the engine scheduled an advance alert for 3:45am. Anything that would fall earlier is delivered at 6:00am; if that collapses the advance alert and last call into the same moment, only the last call ships ("surge may already be building"), and "leave by" advice is dropped if the rider couldn't act on it by then.
- **Per ride type:** the trigger is that ride type's own multiplier crossing 1.25×, not the route-level one. A Two-wheeler commuter's dampened sensitivity means alerts rarely fire (none on a dry Embassy Tech Village morning, only a borderline 1.25× in rain). Silence is the correct output there, not a gap.
- **Working simulator:** the "Push alerts · commute simulator" panel in `app.html` generates all three notifications from the same engine for any route with a learned commute; a route with no pattern stays silent, matching "for a rider with a learned route pattern" above.

### 9. Reason Tags ("Events")

Where available, a forecast is annotated with a short reason: "Heavy rain", "Event nearby", "Weekday morning peak", "Saturday night demand". v1 reason tags are derived from the same time-of-day/rain/event fields the forecast engine already matches on — not a separate signal, and not wired to a live weather/events API in v1 (static per the seed dataset). Reason tags are shared across modes on the same route/time (a rainy evening affects all modes' demand context), but the multiplier and confidence each mode shows remains independently computed.

### 10. Pickup-Point Recommendations (added v5)

Two distinct sub-features, with different triggers, different confidence bases, and different honesty requirements. They are not the same feature wearing two names — 10a needs real surge-geography data this project doesn't have yet; 10b doesn't.

#### 10a. Fare-driven zone-shift

**Eligibility:** requires per-cell (not just per-route) surge data — the current fare at the rider's exact pickup cell *and* at each adjacent cell within a ~400m walk, both independently confident per Section 1's matching rules. **This data does not exist in the v1 seed set** (route-level matching only, no sub-route geographic resolution). Shipping this sub-feature for real, not as a demo placeholder, is gated on either (a) acquiring or simulating per-cell data at the H3-hex granularity the brainstorm notes already researched, or (b) a cruder proxy (e.g. treating named sub-zones of a route as pseudo-cells) — an open question, not a decision, see Open Questions.

**Display rule, once eligible:** "Walk ~`<N>` min to `<zone name>` — `<cheaper multiplier>` vs `<current multiplier>` here, about `<₹saved>` less." Always shows both numbers side by side — a recommendation with only the cheaper price and no current-price anchor is a blocking bug, same class of issue as Section 5's bare "wait" message.

**Walk-distance ceiling:** capped at the practical distance research suggests riders will actually walk for a fare difference — **~2-3 minutes / 1-2 blocks**, per Uber's own Express POOL conjoint research and Via's observed real-world average pickup walk (~550 ft). This is a **transferred estimate**, not India- or surge-specific data (no such study exists for Indian ride-hailing) — stated honestly in-product nowhere (riders don't need the citation), but the number itself should be treated as a starting assumption to validate, not a measured fact, in any internal review. A 2025 study found a "zero-walk" cliff — riders strongly prefer *no* walking over even a short one — which argues for a high bar on the minimum saving (materiality threshold, same 15% floor as Section 2A's "leave by" comparison) before this ever surfaces at all.

**Capture action:** "Navigate to pickup point" — same principle as Section 5, a recommendation with no way to act on it is useless. Does not replace the existing mode-shift or wait actions; it's a third, independent lever in the same hierarchy.

#### 10b. Access-driven main-road shift

**Eligibility:** does not require surge-geography data at all — this is a static, pre-defined mapping (interior lane / low-access pickup point → nearest main-road pickup point), the same pattern Uber already ships in Jaipur's old city for driver-reachability reasons. v1 can ship this with a hand-curated list of known low-access points per route/city (consistent with how Section 9's reason tags are already static per the seed dataset) rather than needing a live geocoding signal.

**Why it belongs in this PRD and not just in dispatch/ops:** the real-world version of this (Uber's Jaipur pattern) is framed purely as "your driver can't reach you here" — this project's extension is to **also show the fare difference**, if any, between the interior pickup point and the main-road one. This is an honest "extension," not a copy: no sourced evidence found that any India ride-hailing app frames this as a price-comparison feature today (see Background). The fare difference may be zero or negligible in many cases (this is fundamentally an access fix, not a surge fix) — the copy must not imply a saving where none exists.

**Display rule:** "Pickup from `<current point>` may take longer for a driver to reach · `<main-road point>` is `<N>` min away" + price line only if a real, confidently-matched difference exists: "and about `<₹X>` cheaper" — omitted entirely, not zeroed, when there's no fare difference to show (same silence principle as Section 4).

**Capture action:** "Use `<main-road point>` instead" — a one-tap pickup-location change, not a separate flow.

#### Per ride type (built in the prototype)

Both sub-features are evaluated for the ride type the rider currently has selected, so they behave differently across tiers. "Scooty" and "Bike Saver" are not separate tiers in the model; they collapse into Two-wheeler.

| Ride type | 10a zone-shift | 10b main-road shift | Why |
|---|---|---|---|
| Two-wheeler (Bike, Scooty, Bike Saver) | Off in practice | Off | Surge is dampened to 0.25× of the route excess, so walking saves under the 15% floor; bikes can generally enter narrow lanes, so the access benefit is set to 0 |
| Three-wheeler | Off in practice (about 11% saving at a 1.53× route) | On, half strength | Surge dampened to 0.55×; autos reach interior lanes better than cars but not as freely as bikes |
| Standard, Sedan, Six-seater | On | On, full strength | Full surge exposure and full access penalty |

Honest limits on this table: the surge dampening comes from the existing hand-set tier sensitivity constants, and the access strengths (0 / 0.5 / 1) are reasoned inference with no source, not measured. The behavior follows directly from those numbers; it is not a finding about real riders.



- Ola and Rapido support — Uber-only; all verified research (pricing mechanics, Ride Pass, driver revenue-share, seed data) is Uber-specific.
- Cross-platform price comparison or app-switch recommendations.
- Guaranteed forecasts on thin-data routes — silence is the correct behavior there, not a lower-confidence guess (Section 4). This now applies at the (route, mode) level, not just the route level — a thin-data mode stays silent even on a well-covered route.
- **Holding or locking a fare against the market.** A held fare during surge is funded by the driver's 80% share under MVAG 2025 — the exact harm this product's action hierarchy exists to avoid — and it works against the self-correcting signal the forecast depends on. Uber's own platform doesn't lock fares on scheduled rides either. The one exception, `C1x`'s five-minute stalled-match hold, is service recovery after a platform failure, not a pricing intervention, and is not generalized.
- Dedicated bike-taxi legality prediction — mode-shift fallback only; category has flipped legal status four times in five years in Karnataka alone, too volatile to model. (Per-mode surge modeling still covers Bike as a mode where it's legally operating and has data — this non-goal is specifically about predicting *legality*, not about excluding Bike from the surge engine.)
- Driver-facing companion features — named as future vision, out of scope for v1.
- Real production integration with Uber — a standalone demo layer; no live Uber API calls.
- ~~Zone-shift recommendations (walk to a cheaper adjacent pickup cell) — the conceptually strongest action in the hierarchy, but needs per-cell surge data the v1 seed set doesn't have. Deferred to v2.~~ **Superseded in v5** — pulled into scope as Section 10a, but the underlying data gap this non-goal named is still real and unresolved (see Section 10a's eligibility note and Open Questions). The access-driven sibling (Section 10b) does not have this gap and can ship independently.
- **Cross-mode comparison beyond the rider's own city/route data** — the engine ranks modes using the same historical-match logic as everything else; it does not attempt to model structural mode-choice behavior (e.g. "riders in this city generally prefer Auto over Bike regardless of price") — that's a different, harder problem than surfacing each mode's own honest multiplier.

## Success Metrics

**Leading**
- Forecast coverage — % of destination-set sessions where the engine can produce a confident forecast (not just current-price-only) — reported **overall and broken out per mode**, so a high aggregate number can't hide a mode that's silent almost everywhere.
- Forecast precision/recall vs. the naive rush-hour baseline on held-out data — per mode as well as aggregate, same reasoning.
- Intent-capture rate — % of testers shown an elevated forecast who say they'd take a capture action rather than abandon/app-switch — **mode-shift now counted as a capture action**, alongside alert/reserve. **Added v5:** pickup-point shift (10a or 10b) counted the same way once either ships.
- **Added v5:** pickup-point recommendation coverage — % of sessions where 10a or 10b has enough data/mapping to show a recommendation at all, tracked separately per sub-feature since 10b should be near-100% (static mapping) while 10a's coverage is gated entirely on resolving the per-cell data question.

**Lagging**
- Modeled ₹ saved per week for a consistent rider (explicitly labeled modeled, not measured) — now able to model savings from mode-shift, not just wait, which should raise this number and better reflect what the CCI data says Indian riders actually do. **Added v5:** once 10a ships, its modeled savings should be reported separately from wait/mode-shift savings, not folded in — it's the least-validated of the three levers (transferred walk-distance assumption, no real per-cell data yet) and blending it in would quietly inflate confidence in the other two.
- Qualitative trust signal: would a tester still act on a forecast after seeing one be wrong once.

## Open Questions

- What seed data does the simulator run against for the quantitative eval — recommendation stands: Boston Uber-filtered dataset (real `surge_multiplier` field) for the eval, synthetic Bengaluru data (calibrated to the Wayfare design numbers) for the app demo. **New:** does the seed dataset carry per-mode fields at sufficient volume for Bike/Auto/Go/Premier separately, or does per-mode modeling need to launch with fewer modes covered and the rest explicitly silent?
- What forecast horizon does v1 commit to — 30, 60, or 90 minutes — and at what geographic granularity does a "route" match to history?
- Who provides real user feedback within the 2–4 week window?
- **New:** which modes ship in v1's per-mode model — all modes present in the ride-selection sheet (Bike, Auto, Go, Go AC, Premier, XL, etc.), or a smaller initial set (e.g. Auto + Go + Premier, the three with likely the most seed-data volume), with the rest added once real fare history exists?
- **New (v5):** how does 10a actually get per-cell data — simulate H3-hex-level synthetic data (consistent with how the route-level seed set was built), or ship with a cruder named-sub-zone proxy first and treat true per-cell resolution as a later pass? This blocks 10a from being more than a demo placeholder until decided.
- **New (v5):** is the ~2-3 minute walk ceiling (transferred from Uber Express POOL / Via data, not India-specific) the right default, or should it be a configurable per-city parameter from day one, given no real Indian-rider walk-tolerance data exists to validate it against?
- **Decided 2026-11-17:** two-wheeler riders are the most price-sensitive segment and the one Rapido is built around, yet both pickup features are effectively off for them under the current constants. Decision: keep them off for v1 and revisit only with real bike-taxi rider input (for example a fixed-fee pickup point rather than a surge-driven one), not by tuning more constants.
- **New (v5):** who curates the "low-access pickup point" list for 10b, and does it launch with the same small set of seed routes/cities as the rest of v1, or need its own separate scoping?

---
*Companion docs: `brainstorm-notes.md` (full research/rationale), `roadmap.md` (Now/Next/Later view, kept in sync with this doc).*
*Design references: [Figma file](https://www.figma.com/design/2Ly9NolRhiaBJ9Iz753ayp/Surge-Alert---Uber-UI-Reference) and the Wayfare canvas (`wayfare-design-feature-spec.md`).*
*Working demo: `app.html` (engine-backed forecast bench) + `eval_report.md` (engine vs. naive-baseline evaluation), built 2026-09-10 — per-mode modeling implemented 2026-09-15.*

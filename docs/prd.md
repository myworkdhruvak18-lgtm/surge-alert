# PRD — Surge Alert: Route Fare Forecast & Timing Nudge

**Status:** Draft v4 — added per-mode surge modeling, 2026-09-15 · **Owner:** Dhruva (solo, PM portfolio project) · **Timeline:** 2-4 weeks, spec through demo · **Platform:** Uber only (v1)
**Full research/rationale lives in `brainstorm-notes.md`.** This doc is the build-facing spec, restructured after reviewing the team's "Inline Rating" PRD format (Background → Objective → Current Construct → Limitations → Proposed Construct, numbered and state-driven) so it reads the way an engineer expects a spec to read: rules and thresholds first, narrative rationale kept to the Background section only.

---

## Background

Today, a rider only sees a fare's surge multiplier at the moment of booking, with no context attached. The number carries no history — the app doesn't say whether it's normal for this route at this hour, whether it's still climbing or already easing, or whether waiting a few minutes changes anything. The decision is made blind, and collapses to a binary: pay it, or abandon the trip. In practice a third path exists — the rider opens a competitor app to compare — which is the worst outcome for Uber of the three.

To fix this, a forecast engine will read the rider's own historical fare data and the current fare, and surface honest price context — current-vs-normal, and where confident, a short-horizon direction — inline at the moment a destination is set, before the rider commits to booking.

**Why per-mode, not just per-route (added v4):** India-specific research complicates the "wait for it to ease" premise the v1-v3 spine leaned on. The CCI's 2022 market study (2,000 riders, Delhi/Mumbai/Jaipur/Indore) found that when facing a surge, Indian riders overwhelmingly **substitute mode, not time** — Delhi riders shift to metro, Mumbai riders to autos, Tier-II riders to personal vehicles — rather than waiting the surge out. That's a materially different behavior than the "hold on, it eases in ~12 min" model the time-series surface (`S1`-`S3`) is built around. It doesn't invalidate the wait-based forecast (heavy/frequent riders — this product's primary persona — showed the highest tolerance for waiting and highest surge tolerance in the same study), but it means mode-shift can't stay a single "Least affected" tag bolted onto the cab flow — it needs to be a real, independently-forecast signal so a rider can compare *this route's* current Auto multiplier against its Bike or Go multiplier, not just be told one mode happens to be cheaper right now.

## Objective

- Show price context (current fare vs. typical-for-this-route-and-hour) at destination-set, for every route, with no personalization required.
- Where the engine has enough history to be confident, show a short-horizon forecast (30–90 min) and a recommended action.
- **Forecast and display surge independently per ride mode** (Bike, Auto, Go/Hatchback, Premier, XL, etc.) on a given route — not one multiplier scaled by a fixed per-mode ratio. Modes surge on different curves (different vehicle supply pools, different demand elasticity), and the mode-shift action only works if the alternative's own multiplier is real, not assumed.
- Never show a forecast the engine isn't confident in — silence is the fallback, not a guess. Confidence gating applies per mode, not just per route: a route can be confident for Auto and silent for Premier if Premier has too few historical trips on that route.
- Pair every "wait, it'll be cheaper" message with an action that keeps the rider inside the Uber flow (notify-when-drops, schedule-later, or a cheaper mode/zone) — a wait message with no action attached must never render.
- Extend the same engine to a scheduled push for riders with a learned commute pattern, so the pull (in-app) and push (notification) surfaces are one model, not two.
- Beat a naive "surge = rush hour" baseline on forecast precision/recall, evaluated on held-out data, to prove the model adds real signal — evaluated per mode as well as in aggregate, since a model that's accurate for cabs but noisy for autos would overstate its own reliability.

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

### 9. Reason Tags ("Events")

Where available, a forecast is annotated with a short reason: "Heavy rain", "Event nearby", "Weekday morning peak", "Saturday night demand". v1 reason tags are derived from the same time-of-day/rain/event fields the forecast engine already matches on — not a separate signal, and not wired to a live weather/events API in v1 (static per the seed dataset). Reason tags are shared across modes on the same route/time (a rainy evening affects all modes' demand context), but the multiplier and confidence each mode shows remains independently computed.

## Non-Goals (v1)

- Ola and Rapido support — Uber-only; all verified research (pricing mechanics, Ride Pass, driver revenue-share, seed data) is Uber-specific.
- Cross-platform price comparison or app-switch recommendations.
- Guaranteed forecasts on thin-data routes — silence is the correct behavior there, not a lower-confidence guess (Section 4). This now applies at the (route, mode) level, not just the route level — a thin-data mode stays silent even on a well-covered route.
- **Holding or locking a fare against the market.** A held fare during surge is funded by the driver's 80% share under MVAG 2025 — the exact harm this product's action hierarchy exists to avoid — and it works against the self-correcting signal the forecast depends on. Uber's own platform doesn't lock fares on scheduled rides either. The one exception, `C1x`'s five-minute stalled-match hold, is service recovery after a platform failure, not a pricing intervention, and is not generalized.
- Dedicated bike-taxi legality prediction — mode-shift fallback only; category has flipped legal status four times in five years in Karnataka alone, too volatile to model. (Per-mode surge modeling still covers Bike as a mode where it's legally operating and has data — this non-goal is specifically about predicting *legality*, not about excluding Bike from the surge engine.)
- Driver-facing companion features — named as future vision, out of scope for v1.
- Real production integration with Uber — a standalone demo layer; no live Uber API calls.
- Zone-shift recommendations (walk to a cheaper adjacent pickup cell) — the conceptually strongest action in the hierarchy, but needs per-cell surge data the v1 seed set doesn't have. Deferred to v2.
- **Cross-mode comparison beyond the rider's own city/route data** — the engine ranks modes using the same historical-match logic as everything else; it does not attempt to model structural mode-choice behavior (e.g. "riders in this city generally prefer Auto over Bike regardless of price") — that's a different, harder problem than surfacing each mode's own honest multiplier.

## Success Metrics

**Leading**
- Forecast coverage — % of destination-set sessions where the engine can produce a confident forecast (not just current-price-only) — reported **overall and broken out per mode**, so a high aggregate number can't hide a mode that's silent almost everywhere.
- Forecast precision/recall vs. the naive rush-hour baseline on held-out data — per mode as well as aggregate, same reasoning.
- Intent-capture rate — % of testers shown an elevated forecast who say they'd take a capture action rather than abandon/app-switch — **mode-shift now counted as a capture action**, alongside alert/reserve.

**Lagging**
- Modeled ₹ saved per week for a consistent rider (explicitly labeled modeled, not measured) — now able to model savings from mode-shift, not just wait, which should raise this number and better reflect what the CCI data says Indian riders actually do.
- Qualitative trust signal: would a tester still act on a forecast after seeing one be wrong once.

## Open Questions

- What seed data does the simulator run against for the quantitative eval — recommendation stands: Boston Uber-filtered dataset (real `surge_multiplier` field) for the eval, synthetic Bengaluru data (calibrated to the Wayfare design numbers) for the app demo. **New:** does the seed dataset carry per-mode fields at sufficient volume for Bike/Auto/Go/Premier separately, or does per-mode modeling need to launch with fewer modes covered and the rest explicitly silent?
- What forecast horizon does v1 commit to — 30, 60, or 90 minutes — and at what geographic granularity does a "route" match to history?
- Who provides real user feedback within the 2–4 week window?
- **New:** which modes ship in v1's per-mode model — all modes present in the ride-selection sheet (Bike, Auto, Go, Go AC, Premier, XL, etc.), or a smaller initial set (e.g. Auto + Go + Premier, the three with likely the most seed-data volume), with the rest added once real fare history exists?

---
*Companion docs: `brainstorm-notes.md` (full research/rationale), `roadmap.md` (Now/Next/Later view, kept in sync with this doc).*
*Design references: [Figma file](https://www.figma.com/design/2Ly9NolRhiaBJ9Iz753ayp/Surge-Alert---Uber-UI-Reference) and the Wayfare canvas (`wayfare-design-feature-spec.md`).*
*Working demo: `app.html` (engine-backed forecast bench) + `eval_report.md` (engine vs. naive-baseline evaluation), built 2026-09-10 — per-mode modeling implemented 2026-09-15.*

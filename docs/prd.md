# PRD — Surge Alert: Route Fare Forecast & Timing Nudge

**Status:** Draft v6 — v5 pickup-point recommendations revised after review (7–10 min walk, nearest walk wins and one card everywhere, station vs house flow, Book here, short-trip rule), per-ride-type forecasting built on simulated per-ride-type history, and the push surface reduced to a single commute ping, 2026-11-19; consistency pass 2026-11-21. Canonical prototype: `app/app-uber-ui.html` · **Owner:** Dhruva (solo, PM portfolio project) · **Timeline:** 2-4 weeks, spec through demo · **Platform:** Uber only (v1)
**Full research/rationale lives in `brainstorm-notes.md`.** This doc is the build-facing spec, restructured after reviewing the team's "Inline Rating" PRD format (Background → Objective → Current Construct → Limitations → Proposed Construct, numbered and state-driven) so it reads the way an engineer expects a spec to read: rules and thresholds first, narrative rationale kept to the Background section only.

---

## Background

Today, a rider only sees a fare's surge multiplier at the moment of booking, with no context attached. The number carries no history — the app doesn't say whether it's normal for this route at this hour, whether it's still climbing or already easing, or whether waiting a few minutes changes anything. The decision is made blind, and collapses to a binary: pay it, or abandon the trip. In practice a third path exists — the rider opens a competitor app to compare — which is the worst outcome for Uber of the three.

To fix this, a forecast engine will read the rider's own historical fare data and the current fare, and surface honest price context — current-vs-normal, and where confident, a short-horizon direction — inline at the moment a destination is set, before the rider commits to booking.

**Why per-mode, not just per-route (added v4):** India-specific research complicates the "wait for it to ease" premise the v1-v3 spine leaned on. The CCI's 2022 market study (2,000 riders, Delhi/Mumbai/Jaipur/Indore) found that when facing a surge, Indian riders overwhelmingly **substitute mode, not time** — Delhi riders shift to metro, Mumbai riders to autos, Tier-II riders to personal vehicles — rather than waiting the surge out. That's a materially different behavior than the "hold on, it eases in ~12 min" model the time-series surface (`S1`-`S3`) is built around. It doesn't invalidate the wait-based forecast (heavy/frequent riders — this product's primary persona — showed the highest tolerance for waiting and highest surge tolerance in the same study), but it means mode-shift can't stay a single "Least affected" tag bolted onto the cab flow — it needs to be a real, independently-forecast signal so a rider can compare *this route's* current Auto multiplier against its Bike or Go multiplier, not just be told one mode happens to be cheaper right now.

**Why pickup-point recommendations, and why now (added v5):** v4's action hierarchy covers timing (wait) and mode (shift), but not location: a rider at a high-surge pickup point has no way to know that walking a short distance would put them in a materially cheaper zone. v1-v4 deferred this as "Zone-shift recommendations... needs per-cell surge data the v1 seed set doesn't have" (that deferral is now Section 10a). Research for this version (full detail in `brainstorm-notes.md`) found that **no India ride-hailing app publicly ships a fare-motivated pickup shift**: not Rapido (its surge-related product, Power Pass, is a paid flat-fare subscription), not Ola, not Uber. So the idea is original to this project, not a copy of an existing feature. A second, access-driven variant (a main-road pickup for riders on a lane) was designed and then dropped by the product owner on 2026-11-17; see Non-Goals.

## Objective

- Show price context (current fare vs. typical-for-this-route-and-hour) at destination-set, for every route, with no personalization required.
- Where the engine has enough history to be confident, show a short-horizon forecast (30–90 min) and a recommended action.
- **Forecast and display surge independently per ride mode** (Bike, Auto, Go/Hatchback, Premier, XL, etc.) on a given route — not one multiplier scaled by a fixed per-mode ratio (**built in the prototype from v6 on simulated per-ride-type history; see the per-mode note below**). Modes surge on different curves (different vehicle supply pools, different demand elasticity), and the mode-shift action only works if the alternative's own multiplier is real, not assumed.
- Never show a forecast the engine isn't confident in — silence is the fallback, not a guess. Confidence gating applies per mode, not just per route: a route can be confident for Auto and silent for Premier if Premier has too few historical trips on that route.
- Pair every "wait, it'll be cheaper" message with an action that keeps the rider inside the Uber flow (notify-when-drops, schedule-later, or a cheaper mode/zone) — a wait message with no action attached must never render.
- Extend the same engine to a scheduled push for riders with a learned commute pattern, so the pull (in-app) and push (notification) surfaces are one model, not two.
- Beat a naive "surge = rush hour" baseline on forecast precision/recall, evaluated on held-out data, to prove the model adds real signal — evaluated per mode as well as in aggregate, since a model that's accurate for cabs but noisy for autos would overstate its own reliability.
- **Added v5:** where the data supports it, recommend a specific nearby pickup point that sits in a materially cheaper surge zone, always showing the price difference between "here" and "there," never a silent redirect.

**Per-mode note (v6, honesty):** versions v4 and v5 derived each ride type's number by scaling one route forecast with hand-set sensitivities (0.25 / 0.55 / 1.00); that is retired. From v6 the prototype's simulated fare history has a **ride-type column** (Two-wheeler, Three-wheeler, Standard, Sedan, Six-seater), and the engine matches comparable trips, applies the confidence floor, goes silent, and reports coverage **per ride type**; the evaluation scores each trip against its own ride type's forecast. What is still not real: the per-ride-type behaviour in the simulated data is **our assumption**, namely how strongly each ride type follows the demand curve (0.30 / 0.60 / 1.00 / 1.05 / 1.15), how hard rain and events hit it, how noisy it is, and how much history it has (six-seater is about 1% of standard volume on purpose, so it can go silent). The route-level number used by the pickup rule's zone-surge drop is the Standard forecast. So the architecture now matches this PRD's per-mode wording, but the data behind it is simulated; say so in any external description.

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
- *Before* the predicted peak: multiplier trend chart, "likely to hit `<range high>` by `<peak time>`", a "leave by `<time>`, pay `<₹X>` instead of `<₹Y>`" comparison (only shown if the saving clears the 15% materiality threshold), actions **Reserve `<time>`** / **Alert me at 1.0×**.
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
- **Reserve `<time>`** — hands off to Uber's own Reserve flow for the predicted cheaper time, on that same mode. Uber quotes the Reserve price at booking (described by Uber as locked, and possibly with a reservation fee and higher cancellation fees), so the forecast price on the card is **not** a promise of the Reserve price. The card carries a line saying so ("Uber quotes the Reserve price when you book, and it may include a reservation fee. It can differ from this forecast."). Whether a Reserve quote for a future time already reflects the surge expected then is unverified; until checked in the app, Reserve is offered but not counted as a validated capture action or as a source of modelled savings.

A "wait / it'll be cheaper later" message rendered with zero capture actions is a blocking bug, not a design preference — it is a feature that quietly hands the rider to a competitor app. **Mode-shift (picking a cheaper row in `B1s`) counts as a valid capture action in its own right** — it keeps the rider inside the booking flow without requiring them to wait at all, which per the CCI finding is what most Indian riders actually do when surged.

### 6. Dismiss / Snooze Behaviour

| State | Rider action | Result |
|---|---|---|
| Forecast shown, rider dismisses | Tap outside / swipe away | Widget collapses for this session; re-evaluated fresh on next destination-set |
| "Alert me at 1.0×" active, price drops | — | Push fires once, then the alert auto-clears (no repeat pinging) |
| "Reserve `<time>`" booked | — | Handed to the existing Reserve flow; surge forecasting has no further role in that booking |

### 7. Miscellaneous

- Forecasts are always a **typical range + risk level** (Low / Medium / High), never a single false-precision number, and clipped to India's MVAG 2025 bounds (0.5×–2.0×) — **per mode**, since different vehicle categories may have different effective bounds in practice even under the same national ceiling.
- **Calibration (eval v6, current):** the band is the p25 to p75 of similar past trips and holds 50.3% of new outcomes on the held-out weeks; 24.5% of ranges are zero-width; the Medium risk label is right 75.0% of the time (`eval/eval_report.md`). It is labelled a typical range, not an interval, in the app, the engine panel and the eval panel (decided 2026-11-17; the engine is unchanged). The confidence score ranks reliability but is not a probability. Synthetic stationary data, so treat these as a method working, not a measurement of real riders.
- Existing fare, promo, and receipt logic are unchanged; the forecast layer only adds context, never alters pricing.
- A five-minute fare hold during a stalled driver match (`C1x`) is service recovery for a failed match, not a pricing feature, and must not be generalized into a forward-looking price lock — see Non-Goals.

### 8. Push Surface (Commute Alerts)

For a rider with a learned route pattern, the same engine runs on a schedule instead of on demand, against that rider's **most-frequently-booked mode** for the commute route (not necessarily the cheapest — this is about the trip they actually take):
**Revised after review (v6):** the earlier design (advance alert, last call, all clear) is replaced by a single commute ping.
- **Setup:** the rider sets a pickup, a drop and a usual time for each direction (to work, and back), plus which days of the week they commute, and picks the ride type they usually book. The return direction starts as the reverse of the first and only needs a time. Notification permission is requested at the end of setup, after the rider has seen a sample ping, not on first launch. A one-tap pause covers holidays and work-from-home days.
- **One ping per direction per day, sent 45 minutes before the usual time.** The text carries no multiplier: "With <reasons>, <Ride type> fares to <destination> are likely to be high around <usual time>. Start by <usual time minus 30 min> to avoid the surge." (the "With <reasons>," clause is dropped when no reason is known; full wording in Section 11). It is about when to start, not about where to be picked up; pickup-shift suggestions appear later, in the booking flow.
- **Trigger:** the ping is sent only if (a) the forecast for the rider's ride type at the usual time is at least 1.25x, and (b) the forecast 30 minutes before the usual time (the time the ping advises starting by) is at most 1.25x, i.e. below the trigger, so that following the advice avoids the surge level that triggered the ping. Both numbers are product-owner choices informed by simulation (see `docs/ping-threshold-research.md` for every setting compared and why 1.25x / 1.25x was chosen). On the simulated per-ride-type data this pings about 9-12% of dry weekday peak commute times for cabs, about 7-8% for autos, and about 0-3% for two-wheelers; in rain or with an event cabs drop to 2-5% (0% in the evening with both) and two-wheelers rise to 10-13%. The stricter ceilings (1.1x, or a 1.4x trigger with a 1.25x ceiling) fired on only 0-4% of times. The comparison, the sample-size and ramp-shape tests, and the rain/event tables are in `docs/ping-threshold-research.md` and `eval/pickup_sweep_v6_report.md`. A rider whose usual time is in the middle of a long peak correctly gets no ping: starting 30 minutes earlier would still be above the trigger.
- **Notice rule:** the ping must land at least 15 minutes before the advised start. **Quiet hours:** nothing before 6:00am. A ping that would fall earlier is skipped, not moved, because a moved ping could not leave 15 minutes' notice at the default 45-minute lead; riders whose usual time is before 6:45am therefore get no ping (accepted by the product owner). **A ping is never sent between 12:00am and 6:00am**, and never on the previous or next day's clock, even if the quiet-hours setting is changed; this is a hard rule and is tested (no usual time from 0:00 to 23:45 produced a ping outside 0:00-23:59, and no usual time before 6:45am produced one at default settings). No "no surge" message is ever sent, and there is no last call or all clear.
- **Per ride type:** the forecast used is the rider's usual ride type's own multiplier, so a Two-wheeler commuter, whose price barely moves, rarely gets a ping. Silence is the correct output there.
- **Not built / open:** no real-time surge feed and no real weather forecast (the prototype uses the simulated engine); no calendar or work-from-home detection; the day-of-week setup and the pause switch are specified here but not built in the prototype.
- **Working simulator:** the "Push alerts · commute simulator" panel in the prototype (`app-uber-ui.html`) generates this single ping from the same engine for any route with a commute pattern; the ping lead, advice, trigger and gain are all adjustable there.

### 9. Reason Tags ("Events")

Where available, a forecast is annotated with a short reason: "Heavy rain", "Event nearby", "Weekday morning peak", "Saturday night demand". v1 reason tags are derived from the same time-of-day/rain/event fields the forecast engine already matches on — not a separate signal, and not wired to a live weather/events API in v1 (static per the seed dataset). Reason tags are shared across modes on the same route/time (a rainy evening affects all modes' demand context), but the multiplier and confidence each mode shows remains independently computed.

### 10. Pickup-Point Recommendations (added v5; access-driven variant dropped 2026-11-17)

**Flow (revised v6, follows Uber's own sequence).** Where to? → ride options with the route on the map → (only at multi-gate places) Confirm pickup → finding a driver → driver on the way. The feature applies to **every ride type** and only ever shows an anchored comparison (the price at the rider's point and the price at the suggested one); a recommendation with only the cheaper price is a blocking bug, same class as Section 5's bare "wait" message.
- **Single-entry place (a house, a shop):** no pickup picker. If there is surge and at least one point qualifies, the ride-options screen shows **one** suggestion card, chosen by the rule below, with a Book here button. With no surge, or nothing qualifying, nothing is shown.
- **Multi-gate place (a station, a mall):** the rider picks a gate on a separate Confirm pickup page after choosing a ride (the same pattern Uber uses for airports and large venues). Only after a gate is tapped, and only if there is surge, the page shows **one** cheaper-gate suggestion. With no surge, the second stage never appears.

#### 10a. Surge-driven shift

A point qualifies when all of these hold:
- **Walk is between 7 and 10 minutes** from the point the rider is at (their own spot at a house; the gate they picked at a station): nothing closer than 7 minutes and a hard cap at 10. (The prototype measures the walk as the difference between the points' distances along one line; real walk time would come from a routing service.)
- **Its zone surge is at least 0.30× lower** than at the selected point, measured on the underlying surge before ride-type dampening and against a 1.0× floor (a zone can never count as cheaper than 1.0×, and the price shown for it uses that floored surge). The price still uses the selected ride type's own multiplier.
- **The rider's own zone surge is above 1.1×** (strictly). Decided 2026-11-19. In the simulated model this changes nothing, because the 0.30× drop rule already means nothing fires below about 1.5×; it is a product-level guard and a clean definition.
- **The fare saving for the selected ride type clears its floor:** ₹15 for two- and three-wheelers, ₹40 for Standard, ₹60 for Sedan, ₹70 for Six-seater (product-owner numbers, 2026-11-19; the car floors are safety floors set below the simulated 10th-percentile savings, and the Six-seater floor has only 7 simulated firing slots behind it). Below the floor, no card at all.
- **The point is available** (see Availability below).

When several qualify, show **one**: the point with the **nearest walk**; among equals, the one **on the way to and nearest the destination**; any remaining tie goes to the bigger surge drop (product-owner rule, 2026-11-19, replacing biggest-drop-first and the two-card house). Every place type shows one suggestion. The required drop does not rise with walk time: how far someone will walk is what the cap is for, and the saving rule depends only on surge. Nothing shows when the route forecast is silent.

**Short trips (added after review):** no pickup suggestions are made for trips up to 2.5 km (a control in the prototype; the product owner set the 1.8–2.5 km band as the no-suggestion zone, and shorter trips are treated the same, since a 7–10 min walk is already about 550–700 m). At a multi-gate place the gate list is still shown, since the rider has to pick a gate, but the cheaper-gate suggestion is not. The prototype's route distances are treated as km.

**Booking and price (revised v6).** Each suggestion card has a **Book here** button: it books with that point as the pickup, at the price shown on the card, and the rider walks there while the driver comes. The trip screens say where to meet and show the ride type's own multiplier (never a raw zone surge, and nothing under 1.05x). The price is Uber's normal upfront price at the moment of booking, not a separate guarantee. The rider walks only after a driver has accepted and the driver's details are shown. The bench's "None / Some / Many" pile-on control has no effect on bookings.

**Why a pile-on is self-limiting (product-owner reasoning).** If many riders take the walk, demand and surge rise at the suggested point, the gap between the two points shrinks, and the suggestion stops qualifying for riders who book a little later. The feature therefore moves demand only while a real price gap exists, and it never creates a new hot spot on its own. This is a design argument, not a measured result; the simulator's pile-on constants are hand-set.

**Known limits of the booking design (open):** ride-type ETAs are 2–6 minutes but the walk is 7–10, so the driver will usually arrive first. Free waiting time is 5 minutes, after which the regular per-minute wait charge applies (owner decision, 2026-11-20; no extension, no warning). In the simulated model the driver is early in every firing slot and the gap exceeds 5 minutes in 95% of two-wheeler and 100% of three-wheeler cases, so some riders will pay wait charges; a dispatch hold that delays the driver was proposed and **rejected by the owner** (riders move only once a driver is confirmed). There is no cancellation or earnings model, and the Book here price assumes the base fare is the same at both points (see Open Questions).

*Why 7 to 10 minutes.* Both limits are the product owner's rules (the minimum was 5, then 8, and became 7 on 2026-11-20). The minimum means a point closer than 7 minutes (about 450-500 m at 64-71 m/min) is treated as nearly the same place and is not suggested. The 10 minute cap (about 640-710 m) is longer than the evidence supports: the only standards found are a 400 m / 5 min catchment for low-frequency transit stops and an 800 m / 10 min catchment for high-frequency stops (NZTA guidance), a 500 m median bus walk in Melbourne, and pedestrian speeds of about 64-71 m/min. Ride-hailing products advertise only "a couple of blocks" and no ride-hailing source gives an upper limit, so a 7-10 minute walk sits at the top of the transit norm for busy stops but beyond anything shown for ride-hailing, and a 2025 "zero-walk" study suggests even 5 minutes is optimistic. The first research pass recommended about 5 minutes. The window is narrow, so a point only qualifies if it is both far enough to be a different zone and near the cap; it is configurable so a per-city value can replace it once real rider data exists. No evidence supports letting the limits move with the size of the saving. The simulated points sit at 8, 9 and 10 minutes, so the 7 minute minimum changes nothing until a 7-minute point is added.

*Why 0.30.* It is one full risk band (the engine's bands are 1.25× and 1.55×), and at surge levels of 1.3× to 2.0× it equals at least 15% of the fare, matching the 15% materiality floor used for "leave by". Because of the 1.0× floor, nothing surfaces below roughly 1.3× surge in theory (in the simulated model, nothing fires below 1.5×). Because it is measured on the underlying surge, a ride type whose price is dampened (autos, bikes) qualifies like a car but saves fewer rupees for the same drop. Hand-set and configurable, not derived from data.

*Why ₹15.* It keeps the card from asking for a walk of up to 10 minutes to save a few rupees. It is a flat rupee floor, so it barely touches cars (a 0.30 drop saves them about ₹60 or more) and mostly bites two-wheelers, whose price moves only 0.25 of the surge: on a ₹288 route a 0.30 drop saves a bike rider about ₹14. As a loose sanity check, ₹15 over an 8–10 minute walk is about ₹1.5–₹2 per walking minute, near the roughly €0.02 per minute (about ₹2) one e-moped study implied; that study is not ride-hailing and was read at abstract level only. Hand-set and configurable.

#### Which drivers can take an alternate-pickup booking (product-owner rule, 2026-11-21; specification only, not built)

When a rider books at a suggested alternate point, the booking may only go to drivers who **do not have to pass through the surge hotspot** to reach that point:

- **Eligible:** drivers outside the hotspot on the **destination side** of it. If the rider's destination is to the left of the hotspot, only drivers on the left can be booked, not drivers on the right, or in general any driver whose route to the pickup avoids the hotspot.
- **Inside the hotspot:** no driver inside the surge hotspot can be booked, **except** drivers within **500 m of the hotspot's boundary** (the zone boundary polygon, e.g. a KML), even when they are inside it.
- **Fallback (thin supply):** if no eligible driver exists, **all nearby drivers can be booked** and the suggestion still shows. The ETA shown on the card is the ETA of the driver who will actually come.
- **No-acceptance escalation (owner rule, 2026-11-21):** only the eligible drivers (blue) receive the request. If none accepts within **10 minutes** of searching, the request opens to all other nearby drivers (including those inside the hotspot and on the far side). The rider does not walk until a driver has accepted and their details are shown, so the search happens where the rider already is and no walk is wasted. The 10 minutes is the owner's hand-set number. Uber's real matching timeout is not public; the closest public markers are its developer docs treating a match over 5 minutes as "delayed" and its India rider guidance charging a cancellation fee after 5 minutes. 10 minutes is double that, so it is the first value to tune with real data.
- **Why:** a driver crossing the hotspot gets a slow, unreliable ETA, drains supply from the zone surge is trying to attract, and is tempted to cancel for a better trip.
- **Driver fairness (stated explicitly):** drivers inside the hotspot (beyond 500 m of its edge) do not receive these alternate-pickup rides. They still receive surge-priced rides inside the hotspot.
- **Limit of the evidence:** this is a dispatch requirement for the real system. The prototype and the sweep have no drivers, so they are unchanged and cannot validate it; real driver-location and route data are needed before launch. The 500 m edge distance is the owner's number, hand-set.

#### Availability (simulated)

A point is available when its score is at least 0.5, where score = point supply × time-of-day × rain (×0.8) × event (×0.8) × ride-type supply. Time-of-day runs from 0.6 overnight to 1.0 midday, lower in weekday peaks. Ride-type supply runs from 1.0 for cars and bikes down to 0.65 for six-seaters. Unavailable points are greyed out in the list, cannot be selected, and are never recommended. Every one of these numbers is hand-set; there is no driver-supply data.

#### Per ride type (built; counts from `eval/pickup_sweep_v6_report.md`, current rules and per-ride-type engine, 0 violations)

The v6 sweep covers 38,400 pickup scenarios; 30,720 are on trips longer than 2.5 km (the rest correctly show nothing), and in 928 of those the chosen ride type's own forecast was silent (six-seater only), so nothing is shown. A suggestion was shown, by ride type, in:

| Ride type | Suggestion shown (eligible scenarios with a forecast) |
|---|---|
| Two-wheeler | 598 of 6,144 |
| Three-wheeler | 793 of 6,144 |
| Standard | 898 of 6,144 |
| Sedan | 455 of 6,144 |
| Six-seater | 7 of 5,216 |

Six-seaters almost never get a suggestion: their own history is thin (silent forecast in about 15% of simulated slots, mostly in rain or events) and the hand-set 0.65 availability factor keeps their points below the availability line. "Scooty" and "Bike Saver" are not separate tiers in the model; they collapse into Two-wheeler.

#### Dropped: access-driven main-road shift

Designed and removed on 2026-11-17 at the product owner's call. It would have suggested a main-road pickup within 3 minutes for a rider on a lane, shown with or without surge, with a walk discount as the price drop. Uber's own Jaipur old-city pickup points remain the real precedent for the access pattern, but there it is an access fix, never a fare feature. Research notes are kept in `brainstorm-notes.md`.

#### Data gap, still open

Zone factors and availability factors are all hand-set. There is no per-cell surge data and no driver-supply data, so this ships as a clearly labeled simulation, not a validated feature.

#### 10c. Display rules, normal-price times and maps (added v6)

- **Surge under 1.05x is normal pricing.** The app never shows a multiplier below 1.00x, and a forecast between 1.00x and 1.05x is shown as normal pricing with no multiplier. The forecast chart's axis never goes below 1.00x. (Checked on 9,600 forecasts: none below 1x, none inside 1.00-1.05x.)
- **Every hour has data.** At times when prices are normal (or only slightly above usual), the home card still shows a chart of the next hours and a six-hour look-ahead ("Surge expected from 5:00pm" or "No surge expected in the next 6 hours"), so the rider is never shown an empty state.
- **Maps.** The prototype draws a stylised map (not real map tiles): the rider's position on the home screen; the route plus suggested pickup points on the ride-options screen at a single-entry place; the gate choices and, after a tap, the best cheaper gate on the Confirm pickup screen at a multi-gate place; the driver on the way. A real product would use the platform's own map.

### 11. Card and Ping Content (added v6, from owner review)

**Commute ping text.** Title: "Busy fares expected on your commute". Body: "With <reasons>, <Ride type> fares to <destination> are likely to be high around <usual time>. Start by <usual time minus 30 min> to avoid the surge." With no known reason the sentence starts at the ride type. The wording stays "to avoid the surge" (owner's decision, after weighing a softer "fares are likely to be lower"); the known weakness (the earlier start can be only slightly cheaper) is in the research doc and the risks below. The text never carries a multiplier or a price. The notification offers **Pause today** and **Mute this commute**; tapping the body opens the app. Nothing is sent on days when surge is already high before the usual time (decided for v1; no separate "fares will stay high" message).

**What happens after a ping is sent.** A sent notification cannot be taken back, so it stays in the tray; nothing in the design tries to retract it. Inside the app, a black banner ("Your usual 9:00 commute: start by 8:30 to avoid the surge") shows on the home screen from the moment the ping is due until the usual time passes, then goes away. Pause and Mute only stop future pings (Undo is available).

**Reason sources.** Reasons are shown as chips on the cards and as the opening clause of the ping (up to two in the ping, three on a card).

| Reason | Where it comes from in the prototype |
|---|---|
| Rain expected | The rain flag in the simulated fare history (a bench toggle) |
| Event nearby | The event flag in the simulated fare history (a bench toggle) |
| Office start hours | The clock: weekdays 7:30-10:30am |
| Office closing hours | The clock: weekdays 5:00-9:00pm |
| Friday / Saturday night demand | The clock |
| Road congestion | **Label only.** A bench toggle adds the tag; the simulated fares do not respond to it, so it never changes a price or a forecast |
| Construction | **Label only**, same as congestion |

In production, rain, events, congestion and construction would each need a live feed (weather, events, traffic, road works) available 45 minutes ahead; none exists in this project.

**Who sees the home forecast card, and when (owner decision, from design review).** The forecast card and the ride-type chips on the home screen are shown **only to riders who have completed commute setup** (places, usual times, days, ride type, i.e. riders who gave their preferences) **and only inside their commute windows** (from 45 minutes before to 30 minutes after a usual time). Everyone else, and everyone at any other time, sees the normal home screen: search bar, Later and recent destinations (screen 3.4 in the design canvas). Riders still get the forecast, prices and cheaper-pickup suggestions on the ride-options screen once they enter a destination. Applied in the prototype on 2026-11-21: outside the window, or for a route with no learned commute, the home screen shows the search bar, Later and a Recent list instead of the card and chips (same window function as the shortcut, which the sweep checks; the card itself was not visually tested).

**Work / Home shortcut on the home screen.** The shortcut to Work or Home (under the search bar, in "Saved places") is shown **only from 45 minutes before the rider's usual commute time until 30 minutes after it**; at every other time the normal home screen shows, without it (search bar, ride-type chips, forecast card). A morning commute shows Work, an evening commute shows Home. The prototype has one usual time per route; the product specification is one usual time per direction (to work, back home), each with its own window. The two numbers (45 and 30) are product-owner choices; the 45 matches the ping lead.

**Which ride type the home card is for.** The home card starts on the rider's **usual ride type** (the one picked in commute setup, the same one the ping uses) and always says which ride type it is showing in its heading: "Standard · Prices are normal · about Rs 288 to Indiranagar", "Three-wheeler · Surging now". **Home screen order (top to bottom):** search bar, saved places, the commute banner when one is due, the "See prices for" chips (Two-wheeler, Three-wheeler, Standard, Sedan, Six-seater), then the forecast card; the chips sit above the card so the rider picks the ride type before reading its numbers. The chips let the rider switch to another ride type; the usual one is marked with a green dot, and the selected one is filled black. Switching changes the card's price, forecast, chart and "back to normal" time to that ride type's own data, and clears any armed alert (an alert belongs to the ride type that was showing). The ping always uses the usual ride type, never the chip. "Cheaper right now" lists only other ride types whose price right now is actually lower than the one being shown (up to three, cheapest first) and is hidden when none is. A ride type with no forecast shows "<Ride type> · No forecast" in plain words and does not guess. The ride-options screen still lists every ride type with its own price.

**Surge card.** The headline is shown two ways in the prototype for the product owner to compare (bench control "Surge card headline"): **multiplier first** ("2.00x - Rs 424 to Embassy Tech Village right now") or **price first** ("Rs 424 to Embassy Tech Village right now" with a small 2.00x chip). No decision yet. The card also shows reason chips, the chart, the "back to normal" forecast, Alert and Book anyway, and cheaper ride types.

**"Back to normal" forecast and the percentage.** Riders do not see a confidence score. They see when prices are expected to be back to normal and how often that held: "Prices usually back to normal by 10:45am - about 105 min. 7 in 10 similar trips were back to normal by then." *Back to normal* means under 1.05x, the same line as the display rule. The "7 in 10" is the share of comparable past trips (same route, ride type, day type, time window and conditions) whose multiplier was under 1.05x at that time: an observed frequency from history, not a model probability. In the simulation a "back to normal" time exists for only about 17% of surging slots within three hours (about 32% within five hours), because simulated surge tends to last; otherwise the card says "No let-up inside the next three hours." A loose 1.1x line would show it for about 20% within three hours, so the definition is not what limits it. When a ride type has little history (city-wide fallback or fewer than 20 trips) the card adds "Fewer trips on record for this ride type".

**Pickup card.** Each suggestion card has a **Not now** link that hides it (and its map pins) for that route, starting point and ride type until the rider changes any of them. The card does not promise that the driver will wait; free waiting time is 5 minutes (see Known limits in 10a).

## Design Reasoning and Known Risks (added v6)

Points the product owner made during review that belong on the record, with the open risks next to them. These are design reasoning, not measured results.

**Commute ping**
- **No rupee floor on the ping, deliberately.** The pickup shift has a minimum saving because the rider is shown a specific ride and a specific price. The ping compares the surge of the rider's *usual* ride type, but nobody knows which ride the rider will choose once they open the app, so a rupee saving cannot be stated honestly in advance.
- **No minimum gap between the two forecast times, deliberately.** The ping goes out at most once per direction per day, so there is no frequency problem to solve with a gap. Known weakness (recorded in `docs/ping-threshold-research.md`): with trigger and ceiling both at 1.25x, the earlier start can be cheaper by only a few hundredths, so "to avoid the surge" can overstate the benefit for some riders.
- **Days of the week.** The rider chooses which days they commute; the ping is only sent on those days (weekends included if chosen). The prototype has no day selector yet, so weekend behaviour is tested in the sweep (Saturday night) but not controllable in the UI.
- **Silent on already-high days.** The ping tells a rider to start earlier only when starting earlier helps. When surge is already high 30 minutes before the usual time (common for cabs in rain or with an event), nothing is sent. This is by the rule, but it is a gap in value on the worst days (see the sweep report).

**Pickup shift**
- **The walk is an option, not an instruction.** The rider chooses whether to take a suggested point. The feature does not screen for night, rain, luggage or mobility; a rider who does not want to walk simply ignores the card.
- **Gaming (booking the cheap point and asking the driver to come to the original spot) is judged unlikely**: the suggested points are at least 7-10 minutes' walk from the rider's own spot, and no driver will drive that far back. Not tested; an open monitoring item (cancellations and driver wait on Book here trips).
- **Marketplace effect.** The feature moves demand from one place to another; it does not remove it. A rider who walks 7-10 minutes for a saving that is itself modest is giving up convenience for money, and the shift also eases congestion at bottleneck pickups. If many riders take the same suggestion, surge rises at the suggested point, the gap between the points narrows, and the suggestion stops being shown to riders who book a little later, so the feature limits itself. Driver earnings per zone are an open guardrail, not a measured result.
- **Price.** Book here uses Uber's normal upfront price at the moment of booking.

**Known risks (open)**
- Ping advice can be weak when the two forecast times are close; wording says "to avoid the surge".
- Ride-type ETAs are 2-6 minutes but the walk is 7-10, so the driver will usually arrive first and the 5 minute free wait can run out; there is no cancellation or earnings model, and the driver-eligibility rule in 10a is untested without real driver data.
- All zone and availability numbers are hand-set, and the per-ride-type behaviour in the simulated fare history is our assumption (see the per-mode note); the engine is per ride type, the data is not real.
- Rain and event flags are bench toggles; in production the forecast would need a real weather and event feed 45 minutes ahead.
- Kill-criteria thresholds are placeholders until current platform baselines are available (see Metrics, Guardrails and Experiment); the surge shape across a zone and Reserve's pricing are unvalidated.

## Metrics, Guardrails and Experiment (added 2026-11-21, from owner review)

All numbers below that need a platform baseline are **placeholders** until current platform metrics are available. Every metric is reported **per ride type**, and two-wheelers get their own review (see "Two-wheeler review").

### North star

**A surged session ends in a completed trip, not an abandoned or cancelled one, within the same session.** (A fixed time limit such as 60 minutes was rejected: it would penalise long trips. If a time limit is used, it scales with trip length.)

### Primary metrics by surface

- **Forecast card and mode switch:** the share of riders who take a capture action (alert, reserve, or switch ride type) instead of abandoning. Reserve counts only after the Reserve pricing check below.
- **Pickup suggestion (funnel):** card shown, Book here tapped, a driver accepted, the rider reached the pickup point, trip completed. Rupees actually saved versus the price at the rider's own point. Of accepted rides, report separately how many were accepted by **eligible drivers only** (before escalation) and how many **after the request opened to all drivers**, including drivers inside the hotspot.
- **Commute ping:** measured against the hard window the rider chose (days, times, ride type): the share of pinged riders who book before the advised start, and the share who open the app. **Ping correctness** is a separate check: every ping fired on the date and time the rider set and under the ping rules (1.25x trigger, 1.25x ceiling, 45 minutes before, never 12:00am-6:00am, none on paused or muted commutes, none on already-high days).

### Guardrails (a breach pauses the rollout)

**Rider**
- Trip completion rate and cancellation rate, with Book-here trips compared against normal bookings in surge.
- **Lateness over the free wait:** for every Book-here trip, the number of seconds by which the rider arrives after the 5 minute free wait ends (distribution, not just a count of incidents), and the wait charges paid.

**Driver (compare two groups, not one)**
- Drivers who accepted rides **inside the surge hotspot** versus drivers who accepted **alternate-pickup rides**: earnings per hour, cancellation rate, **cancellation reasons**, and time to book.
- Booking time for alternate-pickup requests versus ordinary requests in surge. If alternate-pickup requests take notably longer to book (more of them reach the 10 minute escalation), either relax who may accept them or remove the feature.
- Acceptance rate for alternate-pickup requests, and the escalation rate (how often the request opens to all drivers).

**Marketplace**
- **Hotspot window:** the measurement runs from the first alternate pickup accepted out of a given surge hotspot to the last one accepted from the same hotspot. Inside that window, track surge variance in the hotspot (within its own boundaries) and the surge at the alternate pickup areas, to see whether riders leaving eases the hotspot, raises surge at the alternate points, or distorts either.
- Surge level in the origin zone over the same window against comparable windows without the feature.

**Ping and privacy**
- Ping delivery correctness (above) and commute-pattern data handled under India's DPDP Act (consent, retention, deletion).

There is **no rider rating or vote** on forecast accuracy, because the app does not offer one; trust is read only from behaviour (cancellations, re-bookings, ignoring cards).

### Two-wheeler review

Two-wheeler fares are low, and the rupee floor of Rs 15 means a card is offered only when the saving is worth at least that much. In the simulated model two-wheeler savings fall in a Rs 7-28 range, and 598 of 6,144 eligible scenarios fire. Decision to take with real data: compare every metric above for two-wheelers against the other ride types, and test the floor at Rs 15, a lower value and no floor (plus feature off) in a separate arm. If two-wheeler savings are too small to change behaviour, relax the floor or remove the pickup shift for two-wheelers.

### Experiment design

- **Randomise by zone and time block, not by rider:** riders in a hotspot share one marketplace, so rider-level randomisation would contaminate the comparison (a switchback / geo experiment). Comparable zones with the feature off are the control.
- **Staged rollout:** a small share of zones first, then wider, with a **kill switch** and written thresholds agreed before launch.
- **Reserve and pickup shift are tested separately** from the forecast card, because the pickup shift is the least validated lever.

### Kill criteria (placeholders; need current platform baselines)

- Trip completion rate falls more than **X** points.
- Book-here cancellation rate exceeds **Y**%.
- Earnings of drivers in the surge zone drop more than **Z**%.
- Share of alternate-pickup requests reaching the 10 minute escalation exceeds **W**%.

**Baselines to collect before setting X, Y, Z and W:** current completion and cancellation rate in surge by ride type; driver acceptance rate and time to book in surge by zone; driver earnings per hour in surge zones; share of rides with wait charges; surge variance inside a hotspot over a typical hour.

### Open validations

- **Surge shape across a zone.** Whether the multiplier fades gradually from the hotspot centre or steps at the boundary is not established. Public sources disagree: Uber computes surge per hexagon cell, research finds spillover between neighbouring zones, and an Uber patent describes hard zone boundaries. The prototype uses one fixed multiplier per point, which is a step. The first experiment should measure the real shape, because it decides how much a 7-10 minute walk saves.
- **Reserve pricing (below).**

### Reserve pricing (researched 2026-11-21; Uber help pages, not tested in the app)

- Uber Reserve shows the price up front at booking and describes it as locked, so a reserved ride is not changed by later surge at pickup. The upfront price already includes surge, tolls, surcharges and fees. The Delhi airport page confirms the same terms for India and a booking window up to 90 days ahead.
- The price can change if the route, duration or distance changes materially (added stops, a changed destination, tolls not in the quote).
- Reservations can carry a reservation fee (stated for airport reservations) and higher cancellation fees than on-demand rides.
- **Not established:** whether the price quoted for a future time already reflects the surge expected at that time, or the demand at the moment of booking. That decides whether "Reserve <time>" at a predicted cheaper time really saves money. Until checked in the app, Reserve is shown as an action but not counted as a validated capture action.
- Sources: Uber help "What is Uber Reserve?" and "Uber Reserve - FAQ", and the Uber Delhi Airport pickup page.

## Non-Goals (v1)

- Ola and Rapido support — Uber-only; all verified research (pricing mechanics, Ride Pass, driver revenue-share, seed data) is Uber-specific.
- Cross-platform price comparison or app-switch recommendations.
- Guaranteed forecasts on thin-data routes — silence is the correct behavior there, not a lower-confidence guess (Section 4). This now applies at the (route, mode) level, not just the route level — a thin-data mode stays silent even on a well-covered route.
- **Holding or locking a fare against the market.** A held fare during surge is funded by the driver's 80% share under MVAG 2025 — the exact harm this product's action hierarchy exists to avoid — and it works against the self-correcting signal the forecast depends on. (Correction 2026-11-21: Uber Reserve does show an upfront price at booking that Uber describes as locked, so a reserved ride is not exposed to later surge changes; see "Reserve pricing" below. The point here is that this product does not add its own fare lock.) The one exception, `C1x`'s five-minute stalled-match hold, is service recovery after a platform failure, not a pricing intervention, and is not generalized.
- Dedicated bike-taxi legality prediction — mode-shift fallback only; category has flipped legal status four times in five years in Karnataka alone, too volatile to model. (Per-mode surge modeling still covers Bike as a mode where it's legally operating and has data — this non-goal is specifically about predicting *legality*, not about excluding Bike from the surge engine.)
- Driver-facing companion features — named as future vision, out of scope for v1.
- Real production integration with Uber — a standalone demo layer; no live Uber API calls.
- **Access-driven main-road shift** (suggest a main-road pickup, with a walk discount, when the rider's spot is on a lane): designed in v5 and dropped by the product owner on 2026-11-17. Uber's Jaipur old-city pickup points remain the real precedent for the access pattern; it was never a fare feature there.
- **Cross-mode comparison beyond the rider's own city/route data** — the engine ranks modes using the same historical-match logic as everything else; it does not attempt to model structural mode-choice behavior (e.g. "riders in this city generally prefer Auto over Bike regardless of price") — that's a different, harder problem than surfacing each mode's own honest multiplier.

## Success Metrics

**Leading**
- Forecast coverage — % of destination-set sessions where the engine can produce a confident forecast (not just current-price-only) — reported **overall and broken out per mode**, so a high aggregate number can't hide a mode that's silent almost everywhere.
- Forecast precision/recall vs. the naive rush-hour baseline on held-out data — per ride type as well as pooled, same reasoning. Also report the margin over the strongest simple baseline (a rain/event-aware hour-of-week average): on the simulated eval it is 3.4 F1 points pooled (90.8% vs 87.4%), 3.1 to 4.4 points per ride type, against 20.3 over rush hour alone. The two-wheeler is the weakest (70.8% F1, 3.6 points over its best baseline) because its price rarely reaches the 1.25x line. Evaluated per ride type in `eval/eval_report.md`.
- Intent-capture rate — % of testers shown an elevated forecast who say they'd take a capture action rather than abandon/app-switch — **mode-shift now counted as a capture action**, alongside alert/reserve. **Added v5:** a taken pickup-point shift (10a) counts the same way.
- **Added v5:** pickup-point recommendation coverage: % of sessions where 10a has enough data to show a recommendation at all, tracked per ride type. Gated entirely on resolving the per-cell data question.

**Lagging**
- Modeled ₹ saved per week for a consistent rider (explicitly labeled modeled, not measured) — now able to model savings from mode-shift, not just wait, which should raise this number and better reflect what the CCI data says Indian riders actually do. **Added v5:** once 10a ships, its modeled savings should be reported separately from wait/mode-shift savings, not folded in — it's the least-validated of the three levers (transferred walk-distance assumption, no real per-cell data yet) and blending it in would quietly inflate confidence in the other two.
- Qualitative trust signal: would a tester still act on a forecast after seeing one be wrong once.

## Open Questions

- What seed data does the simulator run against for the quantitative eval — recommendation stands: Boston Uber-filtered dataset (real `surge_multiplier` field) for the eval, synthetic Bengaluru data (calibrated to the Wayfare design numbers) for the app demo. **New:** does the seed dataset carry per-mode fields at sufficient volume for Bike/Auto/Go/Premier separately, or does per-mode modeling need to launch with fewer modes covered and the rest explicitly silent?
- What forecast horizon does v1 commit to — 30, 60, or 90 minutes — and at what geographic granularity does a "route" match to history?
- Who provides real user feedback within the 2–4 week window?
- **New:** which modes ship in v1's per-mode model — all modes present in the ride-selection sheet (Bike, Auto, Go, Go AC, Premier, XL, etc.), or a smaller initial set (e.g. Auto + Go + Premier, the three with likely the most seed-data volume), with the rest added once real fare history exists?
- **New (v5):** how does 10a actually get per-cell data — simulate H3-hex-level synthetic data (consistent with how the route-level seed set was built), or ship with a cruder named-sub-zone proxy first and treat true per-cell resolution as a later pass? This blocks 10a from being more than a demo placeholder until decided.
- **Decided 2026-11-17:** the 0.30 surge-drop rule applies to the underlying zone surge, not the ride type's dampened multiplier, so autos qualify like cars (auto case 1 went from 106 to 755 of 13,824 sweep scenarios).
- **Decided 2026-11-17:** 10a applies to every ride type, two-wheelers included. The rupee floors (Rs 15 two- and three-wheelers, Rs 40 Standard, Rs 60 Sedan, Rs 70 Six-seater) mostly bite the two-wheeler.
- **Decided 2026-11-19:** Book here books at the quoted price (see 10a). Still open: the bench's pile-on effect uses hand-set erosion factors (35% and 70% of the gap) and is inert in the prototype; real convergence data is needed before anyone trusts a number about pile-on.
- **New (v5):** the build assumes the base fare is identical at every pickup point and only surge differs. In reality moving the pickup changes the trip's distance and time, so the base fare shifts a little, up or down.
- **Decided 2026-11-19:** ranking is nearest walk first, then on-the-way and nearest the destination, then the bigger drop; one suggestion everywhere. The rider's own zone surge must be above 1.1x; rupee floors as in 10a. Study: `eval/pickup_threshold_study.js` (simulated data; no rider-surge threshold between 1.05x and 1.4x changes anything).
- **Decided 2026-11-20:** the walk window is 7 to 10 minutes; free waiting time is 5 minutes with no extension or warning; no night or rain rule (the rider decides whether to walk); no minimum gap or rupee floor on the commute ping; "Road congestion" and "Construction" stay as label-only reasons (a reviewer flagged that they never change a price; the owner kept them).
- **Decided 2026-11-20:** no dispatch hold. Delaying the driver after Book here was proposed to prevent wait charges and rejected by the owner: riders only move once a driver is confirmed, as in how people already book. Late arrival is handled by the 5 minute free wait. Open: whether real riders accept paying wait charges when they walk slowly.
- **Decided 2026-11-21:** driver eligibility for alternate-pickup bookings and the 10 minute escalation (see 10a). Open: what Uber actually does when no driver accepts is not public; 10 minutes is hand-set.
- **Open:** kill-criteria numbers (X, Y, Z, W) need current platform baselines; the real surge shape across a zone and whether Reserve at a future time saves money are unvalidated.

---
*Companion docs: `brainstorm-notes.md` (full research/rationale), `roadmap.md` (Now/Next/Later view, kept in sync with this doc).*
*Design references: [Figma file](https://www.figma.com/design/2Ly9NolRhiaBJ9Iz753ayp/Surge-Alert---Uber-UI-Reference) and the Wayfare canvas (`wayfare-design-feature-spec.md`).*
*Working demo: `app/app-uber-ui.html` (canonical; engine-backed forecast bench with the Uber-style phone, maps, pickup shift and commute ping) + `eval_report.md` (engine vs. naive-baseline evaluation). `app/app.html` is the earlier original and `app-redesign.html` / `app-us.html` are older copies. Per-mode forecasting is built (own history, matching, silence and coverage per ride type) on simulated per-ride-type data; the per-ride-type behaviour is assumed (see the per-mode note).*

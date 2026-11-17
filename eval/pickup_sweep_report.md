# Pickup-Point Scenario Sweep

**Date:** 2026-11-17 · **Run with:** `node eval/pickup_sweep.js` (reads `app/app.html` directly, so it tests the shipped logic) · **Companion:** `docs/prd.md` Section 10

## What it covers

Every combination of: 5 routes × 2 day types (weekday, weekend; the engine only distinguishes these) × 96 quarter-hours × rain on/off × event on/off × every selectable pickup point on the route × 5 ride types. That is **69,120 scenarios**. Each one runs the real `pickupRecs()` and is checked against rules re-derived independently in `pickup_sweep_body.js`.

## Result

**0 violations.** No scenario produced a recommendation that broke a rule: case 1 never beyond 5 min, never under a 0.30 surge drop (1.0× floor), never to an unavailable point; case 2 never beyond 3 min, never from a spot that isn't on a lane, never under ₹10, never for a ride type with no access benefit; nothing recommended when the route forecast is silent; nothing recommended that costs more; two-wheelers never get either card.

## What the numbers show

| Ride type | Case 1 fires | Case 2 fires | Of |
|---|---|---|---|
| Two-wheeler | 0 | 0 | 13,824 |
| Three-wheeler | 106 | 1,032 | 13,824 |
| Standard | 854 | 1,233 | 13,824 |
| Sedan | 621 | 1,001 | 13,824 |
| Six-seater | 10 | 535 | 13,824 |

Case 2 can only fire on the two routes whose own spot is on a lane (R1, R3), so its rate is diluted across all routes. Both cards at once: 967 scenarios. Merged into one card because the same point qualifies for both: 29.

Case 1 never fires on R4 (its only alternative is 8 min away, past the cap) and case 2 never fires on R0, R2 or R4 (own spot is not on a lane). Both are working as designed.

## Findings worth knowing

1. **Autos almost never get a case 1 card (106 of 13,824).** The 0.30 drop is measured on the ride type's displayed multiplier, and an auto's price only moves 0.55 of the underlying surge, so the underlying zone drop has to be about 0.55. Applying the 0.30 to the underlying zone surge instead would give autos the same treatment as cars. Open question in the PRD.
2. **Six-seater is mostly gated by the availability model, not by price.** 27,642 of 33,024 Six-seater candidate checks were unavailable. That comes from a hand-set 0.65 ride-type supply factor, not from data.
3. **Overnight is mostly unavailable.** 31,200 of 44,720 candidate checks overnight (70%) fell under the 0.5 availability line, especially with rain or an event. Hand-set time-of-day factors again.
4. **Case 2 without surge is real but narrow.** Of 857 lane scenarios with no surge, case 2 fires in 178 (21%). Availability removes most of the rest. Autos miss the ₹10 line without surge: the ₹15 walk discount scales to about ₹9.92 for them.
5. **Rain and events raise case 1** as intended: 947 vs 644 firings for rain, 1,036 vs 555 for events.

## What this does and doesn't prove

It proves the rules are implemented consistently across the whole input space and that no combination produces a contradictory card. It does not prove any of the inputs are realistic. Zone factors, walk discounts, availability factors and time-of-day factors are all hand-set; there is no per-cell surge data and no driver-supply data. The sweep tests the logic, not the world.

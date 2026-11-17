# Pickup-Point Scenario Sweep

**Date:** 2026-11-17 · **Run with:** `node eval/pickup_sweep.js` (reads `app/app.html` directly, so it tests the shipped logic) · **Companion:** `docs/prd.md` Section 10

## What it covers

Every combination of: 5 routes × 2 day types (weekday, weekend; the engine only distinguishes these) × 96 quarter-hours × rain on/off × event on/off × every selectable pickup point on the route × 5 ride types. That is **69,120 scenarios**. Each one runs the real `pickupRecs()` and is checked against rules re-derived independently in `pickup_sweep_body.js`.

## Result

**0 violations.** No scenario produced a recommendation that broke a rule: never beyond the 5 min cap, never under a 0.30 zone-surge drop (1.0× floor), never to an unavailable point, never to the selected or own point, never one that costs more, never when a bigger-drop qualifying point existed, and never when the route forecast is silent.

## What the numbers show

| Ride type | Card fires | Of |
|---|---|---|
| Two-wheeler | 854 | 13,824 |
| Three-wheeler | 755 | 13,824 |
| Standard | 854 | 13,824 |
| Sedan | 621 | 13,824 |
| Six-seater | 10 | 13,824 |

Overall the card fires in 3,094 of the 21,530 scenarios where the selected point has a zone surge of at least 1.3×. It never fires on R4: its only alternative is 8 minutes away, past the cap.

## Findings worth knowing

1. **Two-wheelers get the card but save very little.** It fires in 854 scenarios, with savings from ₹7 to ₹28; 696 of 854 are under ₹20. A bike's price moves only 0.25 of the underlying surge, so the same zone-surge drop that saves a car rider about ₹100 saves a bike rider a few rupees.
2. **Autos qualify like cars (755 of 13,824)** because the 0.30 rule applies to the underlying zone surge, though they save fewer rupees per drop.
3. **Six-seater is mostly gated by the availability model, not by price.** 27,642 of 33,024 Six-seater candidate checks were unavailable. That comes from a hand-set 0.65 ride-type supply factor, not from data.
4. **Overnight is mostly unavailable.** 31,200 of 44,720 candidate checks overnight (70%) fell under the 0.5 availability line, especially with rain or an event. Hand-set time-of-day factors again.
5. **Rain and events raise the firing rate** as intended: 1,910 vs 1,184 for rain, 2,076 vs 1,018 for events.

## What this does and doesn't prove

It proves the rules are implemented consistently across the whole input space and that no combination produces a contradictory card. It does not prove any of the inputs are realistic. Zone factors and availability and time-of-day factors are all hand-set; there is no per-cell surge data and no driver-supply data. The sweep tests the logic, not the world.

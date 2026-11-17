# Pickup-Point Scenario Sweep

**Date:** 2026-11-17 · **Run with:** `node eval/pickup_sweep.js` (reads `app/app.html` directly, so it tests the shipped logic) · **Companion:** `docs/prd.md` Section 10

## What it covers

Every combination of: 5 routes × 2 day types (weekday, weekend; the engine only distinguishes these) × 96 quarter-hours × rain on/off × event on/off × every selectable pickup point on the route × 5 ride types. That is **80,640 scenarios**. Each one runs the real `pickupRecs()` and is checked against rules re-derived independently in `pickup_sweep_body.js`. A 1 minute point and a 9 minute point are included on purpose so both edges of the 2 to 8 minute window are exercised.

## Result

**0 violations.** No scenario produced a recommendation that broke a rule: never outside the 2 to 8 minute walk window (the 1 and 9 minute points were never recommended), never under a 0.30 zone-surge drop (1.0× floor), never saving under ₹15, never priced without the floored surge, never to an unavailable point, never to the selected or own point, never one that costs more, never when a bigger-drop qualifying point existed, and never when the route forecast is silent. Re-quotes were checked too: a re-quote passes only if it still clears the same bar, and never prices below the 1.0× floor.

## What the numbers show

| Ride type | Card fires | Of |
|---|---|---|
| Two-wheeler | 358 | 16,128 |
| Three-wheeler | 858 | 16,128 |
| Standard | 975 | 16,128 |
| Sedan | 700 | 16,128 |
| Six-seater | 10 | 16,128 |

Overall the card fires in 2,901 of the 23,395 scenarios where the selected point has a zone surge of at least 1.3×.

## Findings worth knowing

1. **The ₹15 floor only ever blocks two-wheelers.** It stopped 617 two-wheeler scenarios that passed every other rule, and none for any other ride type. Two-wheeler firings are 358, with savings of ₹15 to ₹30. A bike's price moves only 0.25 of the underlying surge, so for bikes the ₹15 floor, not the 0.30 drop, is the rule that actually decides.
2. **Autos qualify like cars (858 of 16,128)** because the 0.30 rule applies to the underlying zone surge, though they save fewer rupees per drop.
3. **Six-seater is mostly gated by the availability model, not by price.** 46,844 of 55,296 Six-seater candidate checks were unavailable. That comes from a hand-set 0.65 ride-type supply factor, not from data.
4. **Overnight is mostly unavailable.** 52,312 of 74,880 candidate checks overnight (70%) fell under the 0.5 availability line, especially with rain or an event. Hand-set time-of-day factors again.
5. **Rain and events raise the firing rate** as intended: 1,799 vs 1,102 for rain, 1,939 vs 962 for events.

## Re-quote on arrival

Every scenario where the card fires was re-quoted at its arrival time (the walk time later) at three levels of other riders piling onto the same suggestion: None, Some and Many, which erode 0%, 35% and 70% of the advertised surge gap. The share that still clears the 0.30× and ₹15 bar:

| Other riders | Held | Of | Share |
|---|---|---|---|
| None | 2,800 | 2,901 | 97% |
| Some | 876 | 2,901 | 30% |
| Many | 0 | 2,901 | 0% |

By ride type (None / Some / Many):

| Ride type | None | Some | Many |
|---|---|---|---|
| Two-wheeler | 345 / 358 | 70 / 358 | 0 / 358 |
| Three-wheeler | 828 / 858 | 297 / 858 | 0 / 858 |
| Standard | 944 / 975 | 374 / 975 | 0 / 975 |
| Sedan | 674 / 700 | 135 / 700 | 0 / 700 |
| Six-seater | 9 / 10 | 0 / 10 | 0 / 10 |

How to read it: the 101 failures with no piling-on are forecast drift during the walk. Most recommendations clear the 0.30× bar by only a little, so even modest piling-on breaks them, and "Many" breaks every one (eroding 70% of a gap would need an original drop of about 1.0× to still clear 0.30×). The 35% and 70% erosion factors are hand-set, so this is a warning about how fragile the promise is, not a measurement of how many riders really converge.

## What this does and doesn't prove

It proves the rules are implemented consistently across the whole input space and that no combination produces a contradictory card. It does not prove any of the inputs are realistic. Zone factors and availability and time-of-day factors are all hand-set; there is no per-cell surge data and no driver-supply data. The sweep tests the logic, not the world.

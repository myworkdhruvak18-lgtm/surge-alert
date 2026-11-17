# Pickup-Point Scenario Sweep

**Date:** 2026-11-17 · **Run with:** `node eval/pickup_sweep.js` (reads `app/app.html` directly, so it tests the shipped logic and the shipped data) · **Companion:** `docs/prd.md` Section 10

## What it covers

Every combination of: 5 routes × 2 day types (weekday, weekend; the engine only distinguishes these) × 96 quarter-hours × rain on/off × event on/off × every selectable pickup point on the route × 5 ride types. That is **80,640 scenarios**. Each one runs the real `pickupRecs()` and is checked against rules re-derived independently in `pickup_sweep_body.js`. A 1 minute point and a 9 minute point are included on purpose so both edges of the 2 to 8 minute window are exercised. The forecasts feeding it come from the dated dataset described in `eval/eval_report.md` (v3).

## Result

**0 violations.** No scenario produced a recommendation that broke a rule: never outside the 2 to 8 minute walk window (the 1 and 9 minute points were never recommended), never under a 0.30 zone-surge drop (1.0× floor), never saving under ₹15, never priced without the floored surge, never to an unavailable point, never to the selected or own point, never one that costs more, never when a nearer qualifying point existed, and never when the route forecast is silent. Re-quotes were checked too: a re-quote passes only if it still clears the same bar, and never prices below the 1.0× floor.

## What the numbers show

| Ride type | Card fires | Of |
|---|---|---|
| Two-wheeler | 402 | 16,128 |
| Three-wheeler | 961 | 16,128 |
| Standard | 1,059 | 16,128 |
| Sedan | 802 | 16,128 |
| Six-seater | 13 | 16,128 |

Overall the card fires in 3,237 of the 24,005 scenarios where the selected point has a zone surge of at least 1.3×.

## Findings worth knowing

1. **The ₹15 floor only ever blocks two-wheelers.** It stopped 657 two-wheeler scenarios that passed every other rule, and none for any other ride type. Two-wheeler firings are 402, with savings of ₹15 to ₹23. A bike's price moves only 0.25 of the underlying surge, so for bikes the ₹15 floor, not the 0.30 drop, is the rule that actually decides.
2. **Autos qualify like cars (961 of 16,128)** because the 0.30 rule applies to the underlying zone surge, though they save fewer rupees per drop.
3. **Six-seater is mostly gated by the availability model, not by price.** 46,844 of 55,296 Six-seater candidate checks were unavailable. That comes from a hand-set 0.65 ride-type supply factor, not from data.
4. **Overnight is mostly unavailable.** 52,312 of 74,880 candidate checks overnight (70%) fell under the 0.5 availability line, especially with rain or an event. Hand-set time-of-day factors again.
5. **Rain and events raise the firing rate** as intended: 2,162 vs 1,075 for rain, 2,317 vs 920 for events.

## Re-quote on arrival

Every scenario where the card fires was re-quoted at its arrival time (the walk time later) at three levels of other riders piling onto the same suggestion: None, Some and Many, which erode 0%, 35% and 70% of the advertised surge gap. The share that still clears the 0.30× and ₹15 bar:

| Other riders | Held | Of | Share |
|---|---|---|---|
| None | 3,163 | 3,237 | 98% |
| Some | 293 | 3,237 | 9% |
| Many | 0 | 3,237 | 0% |

By ride type (None / Some / Many):

| Ride type | None | Some | Many |
|---|---|---|---|
| Two-wheeler | 394 / 402 | 19 / 402 | 0 / 402 |
| Three-wheeler | 938 / 961 | 78 / 961 | 0 / 961 |
| Standard | 1,032 / 1,059 | 129 / 1,059 | 0 / 1,059 |
| Sedan | 786 / 802 | 67 / 802 | 0 / 802 |
| Six-seater | 13 / 13 | 0 / 13 | 0 / 13 |

How to read it: the 74 failures with no piling-on are forecast drift during the walk. Most recommendations clear the 0.30× bar by only a little, so even modest piling-on breaks them, and "Many" breaks every one (eroding 70% of a gap would need an original drop of about 1.0× to still clear 0.30×). The 35% and 70% erosion factors are hand-set, so this is a warning about how fragile the promise is, not a measurement of how many riders really converge. Showing the nearest qualifying point rather than the biggest drop lowers the "Some" share from 29% to 9%, because nearer points clear the bar by less.

## Controls check

The prototype's manual controls are checked inside the same run, so a dial that silently stopped working would show up as a violation. 16 of 16 pass:

| Result | Check |
|---|---|
| Pass | default rule picks the nearest qualifying point |
| Pass | biggest-drop rule picks the larger drop |
| Pass | min walk 1 lets the 1 minute point qualify |
| Pass | max walk 9 lets the 9 minute point qualify |
| Pass | zone-surge drop 0.60 removes the card |
| Pass | minimum saving 500 removes the card |
| Pass | forcing the nearest point off moves to the next one |
| Pass | forcing a point on keeps it available |
| Pass | driver supply 0.1 removes the card and explains why |
| Pass | a calm midday explains itself through the floor |
| Pass | custom departure enables alerts on a route with no learned commute |
| Pass | alert items are produced for the learned commute |
| Pass | advance lead dial moves the advance alert later |
| Pass | quiet-until dial holds every alert until then |
| Pass | editing a point changes its walk time |
| Pass | reset restores the defaults |

The sweep itself always runs on the PRD defaults. Changing a dial in the prototype puts you in untested territory, which is why the panel has a reset button.

## What this does and doesn't prove

It proves the rules are implemented consistently across the whole input space and that no combination produces a contradictory card. It does not prove any of the inputs are realistic. Zone factors and availability and time-of-day factors are all hand-set; there is no per-cell surge data and no driver-supply data. The sweep tests the logic, not the world.

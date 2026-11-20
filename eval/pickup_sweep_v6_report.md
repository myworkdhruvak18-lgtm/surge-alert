# Pickup and commute-ping sweep (v6, per-ride-type engine)

Replaces `pickup_sweep_report.md` (old rules, old file). This sweep runs against the **current** prototype `app/app-uber-ui.html`: per-ride-type forecasts, walk window **7-10 min**, nearest walk wins (one card, rider surge above 1.1x, per-ride-type rupee floors 15/15/40/60/70), trip over 2.5 km, commute ping at 1.25x / 1.25x, no ping between 12:00am and 6:00am. Script: `eval/pickup_sweep_v6.js` (+ `pickup_sweep_v6_body.js`); raw output: `eval/pickup_sweep_v6_results.json`. Run with `node eval/pickup_sweep_v6.js` (exit code 0 means no violations).

**Result: 0 violations across 101,072 checks (re-run 2026-11-21 after the home-card window change; 2,751 suggestion slots in `pickup_sweep_v6_results.json`).** All fare data is simulated; this sweep proves the rules are applied as written, not that real riders would behave this way.

## What was checked

| Area | Checks | What it proves |
|---|---|---|
| Surge display rule | 46,848 per-ride-type forecasts (5 routes, 5 days, every 15 min, rain/event on/off, 5 ride types) | No value below 1.00x and none inside 1.00-1.05x (0 below, 0 inside) |
| Pickup suggestions | 38,400 scenarios (route x weekday/Saturday x time x rain x event x starting point x ride type) | The shipped logic matches an independent re-implementation of the rules, using each ride type's own forecast |
| Commute ping | 15,800 scenarios (5 routes x weekday/Saturday x usual times 4:00-23:30 x 5 ride types x dry/rain/event/both) | Never before 6:00am or after 11:59pm, always 15+ min notice, always 45 min before, only when both conditions hold, never a multiplier |
| Controls | 20 checks | Each control changes what it says it changes; reset restores every default; midnight cases below |

## Pickup rules verified

- Walk **7-10 min** from the point the rider is at; zone-surge drop at least 0.30x against a 1.0x floor (measured on the Standard / route-level surge); saving at least the rupee floor, computed from the **chosen ride type's own forecast**; point available; no suggestion on trips at or under 2.5 km; none when the route forecast, or the chosen ride type's own forecast, is silent.
- Rider's own zone surge strictly above 1.1x; saving floors Rs 15 (two- and three-wheelers), Rs 40 (Standard), Rs 60 (Sedan), Rs 70 (Six-seater).
- Ranking: nearest walk, then on the way to and nearest the destination, then the bigger drop. One suggestion at every place type.
- 7,680 of 38,400 scenarios are on routes at or under 2.5 km and correctly produced nothing. 928 eligible scenarios were skipped because the chosen ride type's own forecast was silent (six-seater only). In the remaining scenarios a suggestion was shown 2,751 times (1,620 at houses, 1,131 at the station); never more than one.
- 371 equal ties were resolved by nearer walk; 0 needed the destination tie-break (the hand-set data never produces a tie that survives the walk tie-break, so that rule is untested by the data, not by the logic).

### Where suggestions appear

| Ride type | Eligible scenarios with a forecast | Suggestion shown |
|---|---|---|
| Two-wheeler | 6,144 | 598 |
| Three-wheeler | 6,144 | 793 |
| Standard | 6,144 | 898 |
| Sedan | 6,144 | 455 |
| Six-seater | 5,216 | 7 |

Six-seaters rarely get one: their own history is thin (silent in 1,152 of the swept forecasts, mostly in rain or events) and the hand-set availability factor (0.65) keeps their points below the availability line.

| Condition | Scenarios | Suggestion shown |
|---|---|---|
| rain=0 event=0 | 7,448 | 259 |
| rain=0 event=1 | 7,448 | 718 |
| rain=1 event=0 | 7,448 | 607 |
| rain=1 event=1 | 7,448 | 1,167 |

Suggestions are far more frequent in rain, with an event, or both, as expected, since surge is higher.

## Commute ping at 1.25x / 1.25x, in rain and with events nearby

Share of usual commute times (5 routes, every 15 min in the window) for which a ping would be sent. Same rule everywhere: the rider's ride type is forecast at 1.25x or more at the usual time and at 1.25x or less thirty minutes earlier. Each ride type uses its **own** forecast.

| Window | Ride type | Dry | Rain | Event nearby | Rain + event |
|---|---|---|---|---|---|
| weekday morning (6:00-11:00) | Auto (three-wheeler) | 6.7% | 5.7% | 8.6% | 9.5% |
| weekday morning (6:00-11:00) | Cab (standard/sedan/six-seater) | 8.6% | 1.9% | 1.9% | 9.5% |
| weekday morning (6:00-11:00) | Two-wheeler | 0% | 10.5% | 1.9% | 12.4% |
| weekday evening (16:00-21:00) | Auto (three-wheeler) | 7.6% | 6.7% | 9.5% | 0% |
| weekday evening (16:00-21:00) | Cab (standard/sedan/six-seater) | 9.5% | 3.8% | 1.9% | 0% |
| weekday evening (16:00-21:00) | Two-wheeler | 2.9% | 13.3% | 7.6% | 10.5% |
| Saturday night (19:00-23:30) | Auto (three-wheeler) | 8.4% | 8.4% | 12.6% | 0% |
| Saturday night (19:00-23:30) | Cab (standard/sedan/six-seater) | 11.6% | 5.3% | 4.2% | 0% |
| Saturday night (19:00-23:30) | Two-wheeler | 1.1% | 12.6% | 2.1% | 12.6% |

How often the usual-time condition alone holds (forecast at or above 1.25x at the usual time):

| Window | Ride type | Dry | Rain | Event nearby | Rain + event |
|---|---|---|---|---|---|
| weekday morning (6:00-11:00) | Auto (three-wheeler) | 25.7% | 79% | 60% | 81.9% |
| weekday morning (6:00-11:00) | Cab (standard/sedan/six-seater) | 40% | 89.5% | 89.5% | 85.7% |
| weekday morning (6:00-11:00) | Two-wheeler | 0% | 40% | 4.8% | 56.2% |
| weekday evening (16:00-21:00) | Auto (three-wheeler) | 40% | 85.7% | 73.3% | 100% |
| weekday evening (16:00-21:00) | Cab (standard/sedan/six-seater) | 61% | 92.4% | 97.1% | 100% |
| weekday evening (16:00-21:00) | Two-wheeler | 5.7% | 57.1% | 17.1% | 64.8% |
| Saturday night (19:00-23:30) | Auto (three-wheeler) | 34.7% | 81.1% | 72.6% | 83.2% |
| Saturday night (19:00-23:30) | Cab (standard/sedan/six-seater) | 52.6% | 91.6% | 93.7% | 91.6% |
| Saturday night (19:00-23:30) | Two-wheeler | 1.1% | 52.6% | 7.4% | 60% |

### What this shows

- **Cabs:** the ping fires about 9-12% of dry commute times, but only 2-5% when it is raining or there is an event, and **0% in the evening and on Saturday night when both happen**. In those conditions the usual-time forecast is above 1.25x in 85-100% of cases, but it is already above 1.25x 30 minutes earlier too, so starting earlier would not avoid the surge and the rule correctly stays silent.
- **Autos:** about 7-8% dry, 6-13% with rain or an event, and 0% in the evening and Saturday-night rain-plus-event cases.
- **Two-wheelers** (now with their own data, not a scaled copy of the cab forecast): about 0-3% dry, 10-13% in rain, 2-8% with an event alone, and about 10-13% with both. Their price crosses 1.25x only on bad days, so that is when they are pinged; the earlier start is only slightly cheaper for most of them (see the research doc), so the advice is weakest here.
- **Consequence for the product:** the ping is a "surge is about to build" signal. On the worst days for cab and auto riders, when surge is already high before the usual time, it sends nothing. That is consistent with the rule, but the day a rider most wants a warning can be a day with no ping. Decision for the product owner: leave it silent, or add a different message for already-high days.

## Midnight and quiet hours (added 2026-11-19)

- No usual time from 0:00 to 6:30am produced a ping, for any ride type, in rain, with events, or both.
- With the quiet-hours dial set to 0 (so quiet hours are off), a 12:30am usual time still produced no ping, and across every usual time from 0:00 to 23:45 no ping was ever scheduled outside 0:00-23:59 (no ping on the previous or next day's clock).
- Every ping that fired in the whole sweep was between 6:00am and 11:59pm.

## Controls and defaults checked

- PASS: defaults are 7-10 min, nearest walk, 2.5 km, 1.25 trigger, 1.25 ceiling, 45 min lead, 30 min advice
- PASS: a house in rain at 9:15 gets suggestions
- PASS: switching to nearest-wins can change the first suggestion or keep it, never add one
- PASS: Work / Home shortcut hidden 46 min before the usual commute and shown 45 min before; shown 30 min after and hidden 31 min after; never shown for a route with no usual commute; a custom usual time moves the window
- PASS: walk cap 9 removes every point over 9 min
- PASS: walk minimum 10 keeps only 10 minute points
- PASS: zone-surge drop 1.20 removes the cards
- PASS: minimum saving 500 removes the cards
- PASS: raising the minimum trip above the route length removes the cards
- PASS: driver supply 0.1 removes the cards
- PASS: 7:30 usual time pings at 6:45 by default
- PASS: a 60 min lead moves the ping earlier
- PASS: quiet-until 10:00 silences a ping that would be earlier
- PASS: trigger 1.9 silences the ping
- PASS: ceiling 1.0 silences the ping
- PASS: a 6:30 usual time is never pinged (would be before 6:00)
- PASS: a 12:30am usual time is never pinged, even with quiet hours set to 0
- PASS: no usual time from 0:00 to 23:45 produces a ping outside 0:00-23:59 (quiet hours off)
- PASS: no usual time before 6:45am is ever pinged (default quiet hours)
- PASS: editing a point changes its walk time
- PASS: reset restores every default

## Limits

- The sweep checks the shipped logic against an independent re-implementation; it does not validate the rules themselves, the zone factors, the availability factors, or the per-ride-type behaviour baked into the simulated data (how strongly each ride type follows the demand curve, how hard rain and events hit it, how thin its supply is).
- Re-quote on arrival no longer exists, so the old re-quote results are retired.
- Day-of-week setup, per-direction setup and the pause switch are specified in the PRD but not built, so they are not swept.

# Gap review: PRD, research doc and prototype

Method: three independent reviewers (Opus, Sonnet, Haiku) each read the PRD, the commute-ping research doc, the roadmap, the brainstorm notes and the current prototype (`app/app-uber-ui.html`) and listed gaps. In round 2 each reviewer received the other two lists, re-checked every claim against the files, and said agree / disagree / partly, then listed what all three had missed. This is the merged result. Raw files are in the scratch review folder (not committed). The reviewers checked each other's claims; the product owner has not yet ruled on anything below.

Severity is the reviewers' consensus after round 2.

## A. Agreed by all three (fix or decide first)

| # | Gap | Severity | Where |
|---|---|---|---|
| A1 | **The PRD still says the old pickup rules** (walk 2-8 min, nearest wins, re-quote on arrival). The prototype ships 5-10 min and biggest-drop-wins, with a tie-break toward the destination that no doc mentions. Roadmap repeats the old rules. | HIGH | PRD 10a (about lines 128-150, 208-212), roadmap 36, 120-121 |
| A2 | **The "0 violations in 80,640 scenarios" claim tests the wrong file and wrong rules.** The sweep reads the old `app/app.html`, hard-codes a 2-8 min walk and nearest-wins, and tests the removed re-quote path. The PRD's per-ride-type counts and the "9% hold with piling-on" figure come from it. | HIGH | `eval/pickup_sweep*.js`, PRD 10, roadmap |
| A3 | **Ping advice can be nearly untrue.** With trigger = ceiling = 1.25x, the earlier start can be cheaper by only 0.02x (cab) or 0.04x (auto); 22 of 30 auto cases are under 0.10x. "To avoid the surge" is then false. No minimum gap is implemented. | HIGH | `commuteAlerts`, research doc section 10 |
| A4 | **The 6:00am deferral can never fire.** Ping lead (45) = advice (30) + notice (15), so any clamp to 6:00 makes the ping "late". Usual times before 6:45am silently never ping, despite PRD line 117. No late-night quiet hours either (a 23:45 usual time pings at 23:00). | MED-HIGH | `commuteAlerts` |
| A5 | **"Per-mode" forecasting is not per-mode.** The data has no ride-type column; each ride type is the one route forecast scaled by a hand-set factor (`tierMult`). PRD lines about per-mode matching, per-mode eligibility and per-mode silence describe things that do not exist. Biggest resume-honesty risk. | HIGH | PRD 22, 46, 54, 68, 77, 218 |
| A6 | **The "under 1.05x is normal" rule is not applied everywhere.** The Requested and Matched screens show the underlying zone surge, not the ride-type multiplier (a two-wheeler can show 1.6x after its row said 1.15x); the struck-through "was" price shows from 1.02x; values of 1.01-1.04x appear on some chips and cards. | MED | app lines about 1216, 1574, 1619, 1639 |
| A7 | **State is not reset.** `gateChosen` is never cleared on route change, reset or `resetModel`, so the stage-2 cheaper-gate card can show before any gate is tapped on a second visit. (`walkedFrom` is cleared on route tap and reset but not on the route dropdown, per Sonnet; Haiku found it reset on tap.) | MED | handlers about 1749, 1777, 1790 |
| A8 | **Price shown differs from price booked at stations.** The ride is priced at Gate 1 on Choose; picking another gate on Confirm pickup changes the fare but the gate list shows no price. Book here recomputes rather than saving the quoted fare. | MED | `renderChoose`, `renderPickup` |
| A9 | **PRD is missing ping and pickup success metrics, guardrails, experiment design, rollout/kill switch, a Risks section, and privacy for stored commute locations.** The feedback-loop risk exists only in the research doc. | MED | PRD |
| A10 | **Dead code and stale names.** The walk/re-quote path is unreachable; `whyNoCard` is never called (roadmap says a note is shown); the pile-on controls change nothing; `LAST_CALL_LEAD_MIN` and `ADVANCE_LEAD_MIN` hold new meanings; a comment still says "1.1x". | LOW-MED | app |
| A11 | **Version and pointer drift.** PRD header says v5, section 8 says v6; CLAUDE.md still says PRD v4 and calls `app.html` the working prototype (so future edits may land in the wrong file); four HTML files exist and none is named canonical; PRD footer points to `app.html`. | MED | CLAUDE.md, PRD header/footer, roadmap |
| A12 | **Honesty wording.** "Roughly one working day in ten" misreads the metric: it is a share of commute *times*, so about 9% of riders would be pinged almost every matching weekday and about 91% never. The ping share should always be quoted as "of commute times, simulated". "Original to this project" is an absence-of-evidence claim. | MED | research doc, PRD 116, PRD 16 |

## B. Raised by two or more reviewers, partly disputed

- **Book here makes the driver wait.** Ride ETAs are 2-6 min but the walk is 5-10 min; the matched screen hard-codes "Arriving in 4 min". Agreed as a real gap. Opus called the quoted fare a "fare lock"; Sonnet pointed out it is a forecast quote, not a held price. The owner needs to decide whether the quote is a guarantee. (MED)
- **Alert arming bug.** "Alert me if it surges" on a normal-price card fires on the next render as "back to normal"; the button says 1.0x but the logic uses 1.25x; changing route or time does not clear it. (MED; Haiku found it, Opus verified it, Sonnet agreed)
- **Silent forecast falls back to 1.0x** and is shown as normal pricing, which breaks the PRD's own "silence is not 'no surge'" rule. (MED)
- **Routes R3 (1.8 km) and R4 (2.2 km) can never show pickup cards** because of the 2.5 km rule; R0 (6.4 km), R1 and R2 can. (LOW, expected, but limits the demo)
- **Walk is measured from the selected gate, not from the rider's own spot** as PRD line 133 says; gate geometry is collinear and zone factors are invented. (LOW-MED)
- **Smaller:** confidence % shown to riders though the PRD says it is not a probability; "engine -> silent" shown in rider copy; Work card hard-codes "32 min"; ping lead dial allows 15 min but anything under 45 behaves as "late"; chart draws back across the plot when a window crosses midnight; forecast uses the same day-of-week after midnight; PRD horizon says 30-90 min while the UI shows 150 and 360 min.

## C. Missed in round 1, found in round 2 (consensus: real and worth adding to the PRD)

1. **Driver impact.** Pickup shift moves riders out of high-surge zones, reducing driver earnings where surge was meant to attract drivers. The brainstorm's "zone-shift only redistributes riders" was never re-checked. Needs a driver-impact guardrail.
2. **Gaming.** A rider can book the cheaper point and then ask the driver to come to them; nothing checks the rider is near or arrives.
3. **No opt-out from the walk.** Nothing excludes night, rain, luggage or disability from a 10-minute walk, though rain lowers supply in the model.
4. **The ping has no rupee floor.** The pickup shift requires a minimum saving; the ping implies one but never checks.
5. **Safety and fairness.** Cheaper zones may be lower-supply or less safe at night.
6. **Missing paths.** No notification-denied state, no pause switch, no per-direction or per-day setup in the prototype (one `plannedMinutes` per route); the engine only distinguishes weekday/weekend, yet the ping runs on weekends, which were never tested.
7. **Eval coverage is 100%**, so the silent path is never tested.
8. **Stage 2 at stations is limited to one suggestion** while the PRD says "any number"; the map overlay computes walk distance with a separate formula from the card.
9. **Business tension.** The PRD never states the revenue effect on Uber or the lack of a business-tension section (the roadmap says one was added in v2).
10. **Accessibility and language** are not covered in the PRD.

## D. Decisions needed from the product owner

1. Is the Book-here price a guarantee or "may change"? Who pays if the walk takes longer than the driver ETA?
2. Add a minimum gap (about 0.05-0.10x) to the ping, or soften the copy to "fares may be lower if you start by <time>"?
3. Should pings fire at weekends, and what should happen for usual times before 6:45am?
4. What should happen if the rider changes ride type after a suggestion card shows, or has already booked when the ping is due?
5. Which HTML file is canonical, and should the stale ones (`app.html`, `app-redesign.html`, `app-us.html`) be archived or updated?
6. Re-run the sweep against the shipped defaults, or retire the "80,640 scenarios" claim?
7. Reword the PRD's per-mode language as "per-mode display on a single route forecast", or build real per-mode history?

## E. Suggested order of work

1. Quick code fixes: reset `gateChosen` and the alert on route/time changes, fix the Requested/Matched multipliers and the 1.05x display rule, show price on the gate picker, make "Arriving in X min" real, fix the 6:00am rule (or drop it), remove dead code and rename the constants.
2. PRD pass: rewrite section 10 to the built flow, remove superseded text, fix the per-mode wording, add ping/pickup metrics, guardrails, experiment design, risks and privacy, reconcile versions, update CLAUDE.md and the roadmap.
3. Re-run the pickup sweep against `app-uber-ui.html` with the shipped defaults.
4. Add the ping minimum gap (decision D2).

## Status (2026-11-19, after fixes)

Resolved since the review: A1 (PRD pickup rules rewritten, now 8-10 min), A2 (sweep rebuilt for the current prototype and rules, `eval/pickup_sweep_v6.js`, 0 violations), A5 (per-ride-type forecasting built on simulated per-ride-type history; PRD note rewritten), A4 (6:00am rule documented and made a hard no-ping window from 12:00am to 6:00am, tested), A6 (trip screens show the ride type's own multiplier, nothing under 1.05x), A7 (state reset), A10 (dead walk/re-quote code removed, constants renamed), A11 (versions and CLAUDE.md pointer), the alert-arming bug and the hard-coded "Arriving in 4 min". Open: A3 and A12 wording items (ping gap), A8 (gate price display on Confirm pickup), A9 (metrics, guardrails, experiments, risks: next step), and the section C items (driver impact, safety, missing paths).
